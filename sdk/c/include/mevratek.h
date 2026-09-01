/*
 * Mevratek SDK for C — official client for the Mevratek device-control API.
 *
 * Depends only on libcurl. JSON is handled by a small reader bundled with the
 * library, so firmware targets do not have to pull in a general-purpose JSON
 * dependency.
 *
 * Ownership rule: every `char *` this header returns is heap-allocated and
 * belongs to the caller — release it with mv_free(). Anything returned as
 * `const char *` is owned by the client and dies with it.
 */

#ifndef MEVRATEK_H
#define MEVRATEK_H

#include <stddef.h>

#ifdef __cplusplus
extern "C" {
#endif

#define MEVRATEK_VERSION "0.1.0"

/* ---------------------------------------------------------------- errors -- */

/*
 * Filled in when a call fails. `message` is owned by the caller: release it
 * with mv_error_reset() (safe to call on a zeroed struct, and on success).
 *
 * status_code is the HTTP status, or 0 when the request never reached the
 * server (DNS, TLS, timeout).
 */
typedef struct {
    int   status_code;
    char *message;
} mv_error;

/* Release and zero an error. Always safe. */
void mv_error_reset(mv_error *err);

/* Release any string this library handed you. NULL is fine. */
void mv_free(char *value);

/* --------------------------------------------------------------- client -- */

typedef struct mv_client mv_client;

/*
 * Build a client from a token you saved earlier. `base_url` should include the
 * API prefix, e.g. "https://your-api/api/v1"; a trailing slash is fine.
 * Returns NULL only when out of memory.
 */
mv_client *mv_client_new(const char *base_url, const char *token);

/* Release a client and everything it owns. NULL is fine. */
void mv_client_free(mv_client *client);

/* Bound each request. Default 30 seconds. */
void mv_client_set_timeout(mv_client *client, long seconds);

/*
 * Register a new device and return an authenticated client.
 *
 * `api_key` is an organization API key ("cbk_...") issued from the dashboard:
 * it says which organization the new device belongs to. Registration swaps it
 * for a device token, so the key never has to live on the device.
 *
 * `capabilities_json` is a JSON array, e.g.
 *     "[{\"type\":\"move_forward\"},{\"type\":\"stop\"}]"
 * `meta_json` is a JSON object or NULL.
 *
 * Returns NULL on failure, with `err` filled in. Persist mv_client_token():
 * it is how the device signs in afterwards.
 */
mv_client *mv_register(const char *base_url,
                       const char *api_key,
                       const char *name,
                       const char *robot_type,
                       const char *capabilities_json,
                       const char *meta_json,
                       mv_error   *err);

/* Borrowed accessors — valid until mv_client_free(). NULL when unknown. */
const char *mv_client_token(const mv_client *client);
const char *mv_client_api_key(const mv_client *client);
const char *mv_client_robot_id(const mv_client *client);

/* ------------------------------------------------------ device lifecycle -- */

/*
 * Report liveness; pass NULL for "online". A device with no recent heartbeat
 * reads as offline. Returns 0 on success, -1 on failure.
 */
int mv_heartbeat(mv_client *client, const char *status, mv_error *err);

/* One telemetry reading. Set the has_* flag for each field you populate. */
typedef struct {
    int    has_battery; double battery;
    int    has_speed;   double speed;
    int    has_x;       double x;
    int    has_y;       double y;
    int    has_z;       double z;
    /* Optional JSON array of errors and JSON object of extra fields. */
    const char *errors_json;
    const char *extra_json;
} mv_telemetry;

/* A zeroed reading — start from this so new fields stay unset. */
mv_telemetry mv_telemetry_init(void);

/* Record one reading. Returns 0 on success, -1 on failure. */
int mv_send_telemetry(mv_client *client, const mv_telemetry *telemetry, mv_error *err);

/* What to ask the brain. Only `task` is required. */
typedef struct {
    const char *task;
    /* JSON object describing the device state, or NULL for {}. */
    const char *state_json;
    /* A camera frame as raw bytes — base64-encoded for you. */
    const unsigned char *image;
    size_t image_len;
    /* ...or one you already encoded. Takes precedence over `image`. */
    const char *image_b64;
    /* Defaults to "image/jpeg" when a frame is present. */
    const char *image_media_type;
    const char *frame_url;
    const char *task_id;
} mv_decide_request;

/* A zeroed request — start from this. */
mv_decide_request mv_decide_request_init(void);

/*
 * Ask the brain what to do next. Returns the decision as a JSON object string
 * (caller frees with mv_free), or NULL on failure.
 *
 * Read it with the mv_json_* helpers below.
 */
char *mv_decide(mv_client *client, const mv_decide_request *request, mv_error *err);

/* ----------------------------------------------------------- task engine -- */

/*
 * Pull the next queued task.
 *
 * Returns 0 on success and stores either a JSON object (caller frees) or NULL
 * in *out_json when the queue is empty. Returns -1 on failure.
 */
int mv_next_task(mv_client *client, char **out_json, mv_error *err);

/* Close out a task. Pass NULL for `status` to mean "completed". */
int mv_report_task_result(mv_client *client,
                          const char *task_id,
                          const char *status,
                          const char *result,
                          mv_error   *err);

/* --------------------------------------------- device abstraction layer -- */

/*
 * Capabilities plus the universal actions the brain may use for this device.
 * Pass NULL for `robot_id` to use the device this client registered.
 * Returns JSON (caller frees) or NULL on failure.
 */
char *mv_profile(mv_client *client, const char *robot_id, mv_error *err);

/* How executing one action actually went. */
typedef struct {
    const char *action_id;   /* required */
    const char *status;      /* NULL means "success" */
    int         has_duration_ms;
    int         duration_ms;
    const char *error;
    const char *decision_id;
    const char *action_type;
} mv_execution;

mv_execution mv_execution_init(void);

/* Report the outcome of one command (DAL feedback). 0 on success, -1 on failure. */
int mv_report_execution(mv_client *client, const mv_execution *execution, mv_error *err);

/* ----------------------------------------------------------- JSON reader -- */

/*
 * A deliberately small reader for the responses above. It looks up keys on the
 * top level of one JSON object and indexes JSON arrays — enough to walk a
 * decision without a general-purpose JSON dependency.
 *
 * Every one of these tolerates NULL input and returns NULL / 0 / -1 rather
 * than crashing.
 */

/* String value of `key`, unescaped. Caller frees. NULL when absent or not a string. */
char *mv_json_string(const char *json, const char *key);

/* Number value of `key`. Returns 0 on success, -1 when absent or not a number. */
int mv_json_number(const char *json, const char *key, double *out);

/* Boolean value of `key`. Returns 0 on success, -1 when absent or not a bool. */
int mv_json_bool(const char *json, const char *key, int *out);

/*
 * Raw text of `key`'s value — an object, array, or any scalar exactly as it
 * appeared. Caller frees. Use it to descend into nested structures.
 */
char *mv_json_raw(const char *json, const char *key);

/* Number of elements in a JSON array. -1 when the input is not an array. */
int mv_json_array_length(const char *json_array);

/* Raw text of element `index`. Caller frees. NULL when out of range. */
char *mv_json_array_at(const char *json_array, int index);

/* ---------------------------------------------------------------- misc --- */

/* Base64-encode a buffer. Caller frees. Exposed because frames often need it. */
char *mv_base64_encode(const unsigned char *data, size_t length);

/*
 * Call once at process start if you use the library from several threads, and
 * mv_global_cleanup() before exit. Single-threaded programs can skip both:
 * libcurl initialises itself lazily.
 */
void mv_global_init(void);
void mv_global_cleanup(void);

#ifdef __cplusplus
}
#endif

#endif /* MEVRATEK_H */
