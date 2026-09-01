/*
 * Mevratek SDK for C — HTTP transport and the public API.
 *
 * Every request is built into an mv_buf, sent with libcurl, and answered either
 * as a JSON body the caller owns or as an mv_error carrying the HTTP status.
 */

#include "mv_internal.h"

#include <curl/curl.h>
#include <stdlib.h>
#include <string.h>

#define MV_DEFAULT_TIMEOUT 30L

struct mv_client {
    char *base_url;      /* no trailing slash */
    char *token;
    char *api_key;
    char *robot_id;
    long  timeout;
};

/* ------------------------------------------------------------ utilities -- */

static char *mv_strdup(const char *text)
{
    if (!text) return NULL;
    size_t length = strlen(text);
    char *copy = (char *)malloc(length + 1);
    if (!copy) return NULL;
    memcpy(copy, text, length + 1);
    return copy;
}

void mv_free(char *value)
{
    free(value);
}

void mv_error_reset(mv_error *err)
{
    if (!err) return;
    free(err->message);
    err->message = NULL;
    err->status_code = 0;
}

/* Record a failure on `err` (when the caller asked for one). */
static void fail(mv_error *err, int status_code, const char *message)
{
    if (!err) return;
    free(err->message);
    err->status_code = status_code;
    err->message = mv_strdup(message ? message : "unknown error");
}

void mv_global_init(void)
{
    curl_global_init(CURL_GLOBAL_DEFAULT);
}

void mv_global_cleanup(void)
{
    curl_global_cleanup();
}

/* ---------------------------------------------------------------- base64 -- */

char *mv_base64_encode(const unsigned char *data, size_t length)
{
    static const char alphabet[] =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

    if (!data && length > 0) return NULL;

    size_t out_len = 4 * ((length + 2) / 3);
    char *out = (char *)malloc(out_len + 1);
    if (!out) return NULL;

    size_t o = 0;
    for (size_t i = 0; i < length; i += 3) {
        unsigned int chunk = (unsigned int)data[i] << 16;
        if (i + 1 < length) chunk |= (unsigned int)data[i + 1] << 8;
        if (i + 2 < length) chunk |= (unsigned int)data[i + 2];

        out[o++] = alphabet[(chunk >> 18) & 0x3F];
        out[o++] = alphabet[(chunk >> 12) & 0x3F];
        out[o++] = (i + 1 < length) ? alphabet[(chunk >> 6) & 0x3F] : '=';
        out[o++] = (i + 2 < length) ? alphabet[chunk & 0x3F] : '=';
    }
    out[o] = '\0';
    return out;
}

/* ------------------------------------------------------------- transport -- */

static size_t collect(void *chunk, size_t size, size_t count, void *userdata)
{
    size_t total = size * count;
    mv_buf *buf = (mv_buf *)userdata;
    if (mv_buf_append(buf, (const char *)chunk, total) != 0) return 0;
    return total;
}

/*
 * Perform one request.
 *
 * On a 2xx: returns 0 and stores the body (possibly empty) in *out_body, which
 * the caller frees, plus the status in *out_status.
 * On anything else: returns -1 with `err` filled in.
 */
static int perform(mv_client *client,
                   const char *method,
                   const char *path,
                   const char *body,
                   char      **out_body,
                   long       *out_status,
                   mv_error   *err)
{
    if (out_body) *out_body = NULL;
    if (out_status) *out_status = 0;

    if (!client) {
        fail(err, 0, "client is NULL");
        return -1;
    }

    CURL *curl = curl_easy_init();
    if (!curl) {
        fail(err, 0, "could not initialise libcurl");
        return -1;
    }

    mv_buf url = {0};
    mv_buf response = {0};
    struct curl_slist *headers = NULL;
    char *auth_header = NULL;
    int result = -1;

    if (mv_buf_puts(&url, client->base_url) != 0 || mv_buf_puts(&url, path) != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }

    if (body) {
        headers = curl_slist_append(headers, "Content-Type: application/json");
        if (!headers) { fail(err, 0, "out of memory"); goto done; }
    }
    if (client->token && *client->token) {
        size_t size = strlen(client->token) + 32;
        auth_header = (char *)malloc(size);
        if (!auth_header) { fail(err, 0, "out of memory"); goto done; }
        snprintf(auth_header, size, "Authorization: Bearer %s", client->token);
        struct curl_slist *grown = curl_slist_append(headers, auth_header);
        if (!grown) { fail(err, 0, "out of memory"); goto done; }
        headers = grown;
    }

    curl_easy_setopt(curl, CURLOPT_URL, url.data);
    curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, method);
    curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, collect);
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, &response);
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, client->timeout);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "mevratek-c/" MEVRATEK_VERSION);
    if (headers) curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
    if (body) {
        curl_easy_setopt(curl, CURLOPT_POSTFIELDS, body);
        curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, (long)strlen(body));
    }

    CURLcode code = curl_easy_perform(curl);
    if (code != CURLE_OK) {
        fail(err, 0, curl_easy_strerror(code));
        goto done;
    }

    long status = 0;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &status);
    if (out_status) *out_status = status;

    if (status < 200 || status >= 300) {
        char *message = response.data ? mv_json_string(response.data, "message") : NULL;
        fail(err, (int)status, message ? message : (response.data ? response.data : "request failed"));
        free(message);
        goto done;
    }

    if (out_body) {
        *out_body = response.data ? response.data : mv_strdup("");
        response.data = NULL;   /* ownership handed to the caller */
    }
    result = 0;

done:
    mv_buf_free(&url);
    mv_buf_free(&response);
    free(auth_header);
    if (headers) curl_slist_free_all(headers);
    curl_easy_cleanup(curl);
    return result;
}

/* ---------------------------------------------------------------- client -- */

mv_client *mv_client_new(const char *base_url, const char *token)
{
    if (!base_url) return NULL;

    mv_client *client = (mv_client *)calloc(1, sizeof *client);
    if (!client) return NULL;

    client->base_url = mv_strdup(base_url);
    if (!client->base_url) { free(client); return NULL; }

    /* Trim trailing slashes so path concatenation never doubles up. */
    size_t length = strlen(client->base_url);
    while (length > 0 && client->base_url[length - 1] == '/') {
        client->base_url[--length] = '\0';
    }

    if (token) {
        client->token = mv_strdup(token);
        if (!client->token) { mv_client_free(client); return NULL; }
    }
    client->timeout = MV_DEFAULT_TIMEOUT;
    return client;
}

void mv_client_free(mv_client *client)
{
    if (!client) return;
    free(client->base_url);
    free(client->token);
    free(client->api_key);
    free(client->robot_id);
    free(client);
}

void mv_client_set_timeout(mv_client *client, long seconds)
{
    if (client && seconds > 0) client->timeout = seconds;
}

const char *mv_client_token(const mv_client *client)
{
    return client ? client->token : NULL;
}

const char *mv_client_api_key(const mv_client *client)
{
    return client ? client->api_key : NULL;
}

const char *mv_client_robot_id(const mv_client *client)
{
    return client ? client->robot_id : NULL;
}

mv_client *mv_register(const char *base_url,
                       const char *api_key,
                       const char *name,
                       const char *robot_type,
                       const char *capabilities_json,
                       const char *meta_json,
                       mv_error   *err)
{
    if (!base_url || !name || !robot_type) {
        fail(err, 0, "base_url, name and robot_type are required");
        return NULL;
    }

    /* The org key authenticates registration; the device token replaces it below. */
    mv_client *client = mv_client_new(base_url, api_key);
    if (!client) { fail(err, 0, "out of memory"); return NULL; }

    mv_buf body = {0};
    char *response = NULL;
    int ok = 0;

    if (mv_buf_puts(&body, "{\"name\":") != 0 ||
        mv_buf_put_json_string(&body, name) != 0 ||
        mv_buf_puts(&body, ",\"robot_type\":") != 0 ||
        mv_buf_put_json_string(&body, robot_type) != 0 ||
        mv_buf_puts(&body, ",\"capabilities\":") != 0 ||
        mv_buf_puts(&body, capabilities_json ? capabilities_json : "[]") != 0 ||
        mv_buf_puts(&body, ",\"meta\":") != 0 ||
        mv_buf_puts(&body, meta_json ? meta_json : "{}") != 0 ||
        mv_buf_puts(&body, "}") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }

    if (perform(client, "POST", "/robots/register", body.data, &response, NULL, err) != 0) {
        goto done;
    }

    free(client->token);
    client->token = mv_json_string(response, "token");
    client->api_key = mv_json_string(response, "api_key");
    if (!client->token) {
        fail(err, 0, "registration response carried no token");
        goto done;
    }

    {
        char *robot = mv_json_raw(response, "robot");
        if (robot) {
            client->robot_id = mv_json_string(robot, "id");
            free(robot);
        }
    }
    ok = 1;

done:
    mv_buf_free(&body);
    free(response);
    if (!ok) { mv_client_free(client); return NULL; }
    return client;
}

/* ------------------------------------------------------ device lifecycle -- */

int mv_heartbeat(mv_client *client, const char *status, mv_error *err)
{
    mv_buf body = {0};
    int result = -1;

    if (mv_buf_puts(&body, "{\"status\":") != 0 ||
        mv_buf_put_json_string(&body, status ? status : "online") != 0 ||
        mv_buf_puts(&body, "}") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }
    result = perform(client, "POST", "/robots/heartbeat", body.data, NULL, NULL, err);

done:
    mv_buf_free(&body);
    return result;
}

mv_telemetry mv_telemetry_init(void)
{
    mv_telemetry telemetry;
    memset(&telemetry, 0, sizeof telemetry);
    return telemetry;
}

/* Append `"key":<number|null>,` honouring the has_ flag. */
static int put_optional_number(mv_buf *buf, const char *key, int present, double value)
{
    if (mv_buf_puts(buf, "\"") != 0 ||
        mv_buf_puts(buf, key) != 0 ||
        mv_buf_puts(buf, "\":") != 0) return -1;
    if (present) return mv_buf_put_number(buf, value);
    return mv_buf_puts(buf, "null");
}

int mv_send_telemetry(mv_client *client, const mv_telemetry *telemetry, mv_error *err)
{
    if (!telemetry) { fail(err, 0, "telemetry is NULL"); return -1; }

    mv_buf body = {0};
    int result = -1;

    if (mv_buf_puts(&body, "{") != 0 ||
        put_optional_number(&body, "battery", telemetry->has_battery, telemetry->battery) != 0 ||
        mv_buf_puts(&body, ",") != 0 ||
        put_optional_number(&body, "speed", telemetry->has_speed, telemetry->speed) != 0 ||
        mv_buf_puts(&body, ",") != 0 ||
        put_optional_number(&body, "x", telemetry->has_x, telemetry->x) != 0 ||
        mv_buf_puts(&body, ",") != 0 ||
        put_optional_number(&body, "y", telemetry->has_y, telemetry->y) != 0 ||
        mv_buf_puts(&body, ",") != 0 ||
        put_optional_number(&body, "z", telemetry->has_z, telemetry->z) != 0 ||
        mv_buf_puts(&body, ",\"errors\":") != 0 ||
        mv_buf_puts(&body, telemetry->errors_json ? telemetry->errors_json : "[]") != 0 ||
        mv_buf_puts(&body, ",\"extra\":") != 0 ||
        mv_buf_puts(&body, telemetry->extra_json ? telemetry->extra_json : "{}") != 0 ||
        mv_buf_puts(&body, "}") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }
    result = perform(client, "POST", "/telemetry", body.data, NULL, NULL, err);

done:
    mv_buf_free(&body);
    return result;
}

mv_decide_request mv_decide_request_init(void)
{
    mv_decide_request request;
    memset(&request, 0, sizeof request);
    return request;
}

char *mv_decide(mv_client *client, const mv_decide_request *request, mv_error *err)
{
    if (!request || !request->task) {
        fail(err, 0, "task is required");
        return NULL;
    }

    mv_buf body = {0};
    char *encoded = NULL;
    char *response = NULL;

    if (mv_buf_puts(&body, "{\"task\":") != 0 ||
        mv_buf_put_json_string(&body, request->task) != 0 ||
        mv_buf_puts(&body, ",\"state\":") != 0 ||
        mv_buf_puts(&body, request->state_json ? request->state_json : "{}") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }

    const char *image_b64 = request->image_b64;
    if (!image_b64 && request->image && request->image_len > 0) {
        encoded = mv_base64_encode(request->image, request->image_len);
        if (!encoded) { fail(err, 0, "out of memory"); goto done; }
        image_b64 = encoded;
    }

    if (image_b64) {
        const char *media = request->image_media_type ? request->image_media_type : "image/jpeg";
        if (mv_buf_puts(&body, ",\"image_b64\":") != 0 ||
            mv_buf_put_json_string(&body, image_b64) != 0 ||
            mv_buf_puts(&body, ",\"image_media_type\":") != 0 ||
            mv_buf_put_json_string(&body, media) != 0) {
            fail(err, 0, "out of memory");
            goto done;
        }
    }
    if (request->frame_url) {
        if (mv_buf_puts(&body, ",\"frame_url\":") != 0 ||
            mv_buf_put_json_string(&body, request->frame_url) != 0) {
            fail(err, 0, "out of memory");
            goto done;
        }
    }
    if (request->task_id) {
        if (mv_buf_puts(&body, ",\"task_id\":") != 0 ||
            mv_buf_put_json_string(&body, request->task_id) != 0) {
            fail(err, 0, "out of memory");
            goto done;
        }
    }
    if (mv_buf_puts(&body, "}") != 0) { fail(err, 0, "out of memory"); goto done; }

    perform(client, "POST", "/brain/decision", body.data, &response, NULL, err);

done:
    mv_buf_free(&body);
    free(encoded);
    return response;
}

/* ----------------------------------------------------------- task engine -- */

int mv_next_task(mv_client *client, char **out_json, mv_error *err)
{
    if (!out_json) { fail(err, 0, "out_json is NULL"); return -1; }
    *out_json = NULL;

    char *body = NULL;
    long status = 0;
    if (perform(client, "GET", "/tasks/next", NULL, &body, &status, err) != 0) {
        return -1;
    }

    /* 204 means the queue is empty — success with no task. */
    if (status == 204 || !body || !*body) {
        free(body);
        return 0;
    }
    *out_json = body;
    return 0;
}

int mv_report_task_result(mv_client *client,
                          const char *task_id,
                          const char *status,
                          const char *result,
                          mv_error   *err)
{
    if (!task_id) { fail(err, 0, "task_id is required"); return -1; }

    mv_buf path = {0};
    mv_buf body = {0};
    int outcome = -1;

    if (mv_buf_puts(&path, "/tasks/") != 0 ||
        mv_buf_puts(&path, task_id) != 0 ||
        mv_buf_puts(&path, "/result") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }

    if (mv_buf_puts(&body, "{\"status\":") != 0 ||
        mv_buf_put_json_string(&body, status ? status : "completed") != 0 ||
        mv_buf_puts(&body, ",\"result\":") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }
    if (result) {
        if (mv_buf_put_json_string(&body, result) != 0) { fail(err, 0, "out of memory"); goto done; }
    } else if (mv_buf_puts(&body, "null") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }
    if (mv_buf_puts(&body, "}") != 0) { fail(err, 0, "out of memory"); goto done; }

    outcome = perform(client, "POST", path.data, body.data, NULL, NULL, err);

done:
    mv_buf_free(&path);
    mv_buf_free(&body);
    return outcome;
}

/* --------------------------------------------- device abstraction layer -- */

char *mv_profile(mv_client *client, const char *robot_id, mv_error *err)
{
    const char *id = robot_id;
    if (!id) id = mv_client_robot_id(client);
    if (!id) {
        fail(err, 0, "no robot id: pass one, or use mv_register");
        return NULL;
    }

    mv_buf path = {0};
    char *response = NULL;

    if (mv_buf_puts(&path, "/robots/") != 0 ||
        mv_buf_puts(&path, id) != 0 ||
        mv_buf_puts(&path, "/profile") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }
    perform(client, "GET", path.data, NULL, &response, NULL, err);

done:
    mv_buf_free(&path);
    return response;
}

mv_execution mv_execution_init(void)
{
    mv_execution execution;
    memset(&execution, 0, sizeof execution);
    return execution;
}

/* Append `,"key":<string|null>`. */
static int put_optional_string(mv_buf *buf, const char *key, const char *value)
{
    if (mv_buf_puts(buf, ",\"") != 0 ||
        mv_buf_puts(buf, key) != 0 ||
        mv_buf_puts(buf, "\":") != 0) return -1;
    if (value) return mv_buf_put_json_string(buf, value);
    return mv_buf_puts(buf, "null");
}

int mv_report_execution(mv_client *client, const mv_execution *execution, mv_error *err)
{
    if (!execution || !execution->action_id) {
        fail(err, 0, "action_id is required");
        return -1;
    }

    mv_buf body = {0};
    int result = -1;

    if (mv_buf_puts(&body, "{\"action_id\":") != 0 ||
        mv_buf_put_json_string(&body, execution->action_id) != 0 ||
        mv_buf_puts(&body, ",\"status\":") != 0 ||
        mv_buf_put_json_string(&body, execution->status ? execution->status : "success") != 0 ||
        mv_buf_puts(&body, ",\"duration_ms\":") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }
    if (execution->has_duration_ms) {
        if (mv_buf_put_number(&body, (double)execution->duration_ms) != 0) {
            fail(err, 0, "out of memory");
            goto done;
        }
    } else if (mv_buf_puts(&body, "null") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }

    if (put_optional_string(&body, "error", execution->error) != 0 ||
        put_optional_string(&body, "decision_id", execution->decision_id) != 0 ||
        put_optional_string(&body, "action_type", execution->action_type) != 0 ||
        mv_buf_puts(&body, "}") != 0) {
        fail(err, 0, "out of memory");
        goto done;
    }

    result = perform(client, "POST", "/executions", body.data, NULL, NULL, err);

done:
    mv_buf_free(&body);
    return result;
}
