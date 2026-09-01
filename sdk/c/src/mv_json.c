/*
 * A small JSON reader for the Mevratek C SDK.
 *
 * Scope is deliberately narrow: look up keys on the top level of one object,
 * and index arrays. That is everything the API responses need, and it keeps the
 * SDK dependency-free for firmware targets.
 *
 * The scanner is structure-aware — it steps over nested objects, arrays and
 * escaped strings — so a key nested inside a sub-object never matches a
 * top-level lookup.
 */

#include "mv_internal.h"

#include <stdlib.h>
#include <string.h>

/* Advance past whitespace. */
static const char *skip_space(const char *p)
{
    while (*p == ' ' || *p == '\t' || *p == '\n' || *p == '\r') p++;
    return p;
}

/*
 * Step over one JSON string starting at the opening quote. Returns the position
 * just past the closing quote, or NULL if the string never terminates.
 */
static const char *skip_string(const char *p)
{
    if (*p != '"') return NULL;
    p++;
    while (*p) {
        if (*p == '\\') {
            if (!p[1]) return NULL;
            p += 2;
            continue;
        }
        if (*p == '"') return p + 1;
        p++;
    }
    return NULL;
}

/*
 * Step over exactly one JSON value (of any type) starting at p. Returns the
 * position just past it, or NULL when the value is malformed.
 */
static const char *skip_value(const char *p)
{
    p = skip_space(p);
    if (!*p) return NULL;

    if (*p == '"') return skip_string(p);

    if (*p == '{' || *p == '[') {
        char open = *p;
        char close = (open == '{') ? '}' : ']';
        int depth = 0;
        while (*p) {
            if (*p == '"') {
                const char *after = skip_string(p);
                if (!after) return NULL;
                p = after;
                continue;
            }
            if (*p == open) depth++;
            else if (*p == close) {
                depth--;
                if (depth == 0) return p + 1;
            }
            p++;
        }
        return NULL;
    }

    /* A scalar runs until a delimiter. */
    while (*p && *p != ',' && *p != '}' && *p != ']' &&
           *p != ' ' && *p != '\t' && *p != '\n' && *p != '\r') {
        p++;
    }
    return p;
}

/* Decode a \uXXXX escape into UTF-8. Returns bytes written (0 on a bad escape). */
static size_t decode_unicode(const char *hex, char *out)
{
    unsigned int code = 0;
    for (int i = 0; i < 4; i++) {
        char c = hex[i];
        code <<= 4;
        if (c >= '0' && c <= '9') code |= (unsigned int)(c - '0');
        else if (c >= 'a' && c <= 'f') code |= (unsigned int)(c - 'a' + 10);
        else if (c >= 'A' && c <= 'F') code |= (unsigned int)(c - 'A' + 10);
        else return 0;
    }

    if (code < 0x80) {
        out[0] = (char)code;
        return 1;
    }
    if (code < 0x800) {
        out[0] = (char)(0xC0 | (code >> 6));
        out[1] = (char)(0x80 | (code & 0x3F));
        return 2;
    }
    out[0] = (char)(0xE0 | (code >> 12));
    out[1] = (char)(0x80 | ((code >> 6) & 0x3F));
    out[2] = (char)(0x80 | (code & 0x3F));
    return 3;
}

/*
 * Copy a JSON string literal (starting at the opening quote) into a fresh
 * NUL-terminated buffer, resolving escapes. Caller frees.
 */
static char *unescape_string(const char *p)
{
    const char *end = skip_string(p);
    if (!end) return NULL;

    /* The decoded form is never longer than the literal. */
    size_t span = (size_t)(end - p);
    char *out = (char *)malloc(span + 1);
    if (!out) return NULL;

    size_t written = 0;
    const char *cursor = p + 1;          /* past the opening quote */
    const char *last = end - 1;          /* the closing quote */

    while (cursor < last) {
        if (*cursor != '\\') {
            out[written++] = *cursor++;
            continue;
        }
        cursor++;
        if (cursor >= last) break;
        switch (*cursor) {
            case 'n':  out[written++] = '\n'; cursor++; break;
            case 't':  out[written++] = '\t'; cursor++; break;
            case 'r':  out[written++] = '\r'; cursor++; break;
            case 'b':  out[written++] = '\b'; cursor++; break;
            case 'f':  out[written++] = '\f'; cursor++; break;
            case '"':  out[written++] = '"';  cursor++; break;
            case '\\': out[written++] = '\\'; cursor++; break;
            case '/':  out[written++] = '/';  cursor++; break;
            case 'u':
                if (cursor + 4 < last + 1) {
                    size_t n = decode_unicode(cursor + 1, out + written);
                    if (n == 0) { out[written++] = 'u'; cursor++; break; }
                    written += n;
                    cursor += 5;
                } else {
                    cursor++;
                }
                break;
            default:
                out[written++] = *cursor++;
                break;
        }
    }

    out[written] = '\0';
    return out;
}

/*
 * Find the value for `key` on the top level of the object in `json`.
 * Returns a pointer into `json` at the first character of the value, or NULL.
 */
const char *mv_json_find(const char *json, const char *key)
{
    if (!json || !key) return NULL;

    const char *p = skip_space(json);
    if (*p != '{') return NULL;
    p++;

    size_t key_len = strlen(key);

    for (;;) {
        p = skip_space(p);
        if (*p == '}' || !*p) return NULL;

        if (*p != '"') return NULL;              /* malformed member */
        const char *name = p + 1;
        const char *after_name = skip_string(p);
        if (!after_name) return NULL;
        size_t name_len = (size_t)(after_name - name - 1);

        p = skip_space(after_name);
        if (*p != ':') return NULL;
        p = skip_space(p + 1);

        if (name_len == key_len && memcmp(name, key, key_len) == 0) {
            return p;
        }

        const char *after_value = skip_value(p);
        if (!after_value) return NULL;
        p = skip_space(after_value);
        if (*p == ',') { p++; continue; }
        return NULL;                              /* end of object, no match */
    }
}

char *mv_json_string(const char *json, const char *key)
{
    const char *value = mv_json_find(json, key);
    if (!value || *value != '"') return NULL;
    return unescape_string(value);
}

int mv_json_number(const char *json, const char *key, double *out)
{
    const char *value = mv_json_find(json, key);
    if (!value || !out) return -1;
    if (*value != '-' && *value != '+' && (*value < '0' || *value > '9')) return -1;

    char *end = NULL;
    double parsed = strtod(value, &end);
    if (end == value) return -1;
    *out = parsed;
    return 0;
}

int mv_json_bool(const char *json, const char *key, int *out)
{
    const char *value = mv_json_find(json, key);
    if (!value || !out) return -1;
    if (strncmp(value, "true", 4) == 0)  { *out = 1; return 0; }
    if (strncmp(value, "false", 5) == 0) { *out = 0; return 0; }
    return -1;
}

/* Copy the span [start, end) into a fresh NUL-terminated buffer. */
static char *copy_span(const char *start, const char *end)
{
    size_t length = (size_t)(end - start);
    char *out = (char *)malloc(length + 1);
    if (!out) return NULL;
    memcpy(out, start, length);
    out[length] = '\0';
    return out;
}

char *mv_json_raw(const char *json, const char *key)
{
    const char *value = mv_json_find(json, key);
    if (!value) return NULL;
    const char *end = skip_value(value);
    if (!end) return NULL;
    return copy_span(value, end);
}

int mv_json_array_length(const char *json_array)
{
    if (!json_array) return -1;
    const char *p = skip_space(json_array);
    if (*p != '[') return -1;
    p = skip_space(p + 1);
    if (*p == ']') return 0;

    int count = 0;
    for (;;) {
        const char *end = skip_value(p);
        if (!end) return -1;
        count++;
        p = skip_space(end);
        if (*p == ',') { p = skip_space(p + 1); continue; }
        if (*p == ']') return count;
        return -1;
    }
}

char *mv_json_array_at(const char *json_array, int index)
{
    if (!json_array || index < 0) return NULL;
    const char *p = skip_space(json_array);
    if (*p != '[') return NULL;
    p = skip_space(p + 1);
    if (*p == ']') return NULL;

    for (int i = 0;; i++) {
        const char *end = skip_value(p);
        if (!end) return NULL;
        if (i == index) return copy_span(p, end);
        p = skip_space(end);
        if (*p != ',') return NULL;
        p = skip_space(p + 1);
    }
}

/* ------------------------------------------------------------- writing --- */

int mv_buf_reserve(mv_buf *buf, size_t extra)
{
    if (buf->len + extra + 1 <= buf->cap) return 0;
    size_t cap = buf->cap ? buf->cap : 128;
    while (cap < buf->len + extra + 1) cap *= 2;
    char *grown = (char *)realloc(buf->data, cap);
    if (!grown) return -1;
    buf->data = grown;
    buf->cap = cap;
    return 0;
}

int mv_buf_append(mv_buf *buf, const char *text, size_t length)
{
    if (mv_buf_reserve(buf, length) != 0) return -1;
    memcpy(buf->data + buf->len, text, length);
    buf->len += length;
    buf->data[buf->len] = '\0';
    return 0;
}

int mv_buf_puts(mv_buf *buf, const char *text)
{
    return mv_buf_append(buf, text, strlen(text));
}

void mv_buf_free(mv_buf *buf)
{
    free(buf->data);
    buf->data = NULL;
    buf->len = buf->cap = 0;
}

/* Append `text` as a quoted, escaped JSON string. */
int mv_buf_put_json_string(mv_buf *buf, const char *text)
{
    if (mv_buf_puts(buf, "\"") != 0) return -1;
    for (const unsigned char *p = (const unsigned char *)text; *p; p++) {
        char escape[8];
        switch (*p) {
            case '"':  if (mv_buf_puts(buf, "\\\"") != 0) return -1; continue;
            case '\\': if (mv_buf_puts(buf, "\\\\") != 0) return -1; continue;
            case '\n': if (mv_buf_puts(buf, "\\n")  != 0) return -1; continue;
            case '\r': if (mv_buf_puts(buf, "\\r")  != 0) return -1; continue;
            case '\t': if (mv_buf_puts(buf, "\\t")  != 0) return -1; continue;
            case '\b': if (mv_buf_puts(buf, "\\b")  != 0) return -1; continue;
            case '\f': if (mv_buf_puts(buf, "\\f")  != 0) return -1; continue;
            default: break;
        }
        if (*p < 0x20) {
            snprintf(escape, sizeof escape, "\\u%04x", *p);
            if (mv_buf_puts(buf, escape) != 0) return -1;
            continue;
        }
        if (mv_buf_append(buf, (const char *)p, 1) != 0) return -1;
    }
    return mv_buf_puts(buf, "\"");
}

int mv_buf_put_number(mv_buf *buf, double value)
{
    char text[40];
    /* %.17g round-trips an IEEE double exactly. */
    snprintf(text, sizeof text, "%.17g", value);
    return mv_buf_puts(buf, text);
}
