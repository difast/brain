/* Shared plumbing between the SDK's translation units. Not a public header. */

#ifndef MEVRATEK_INTERNAL_H
#define MEVRATEK_INTERNAL_H

#include "mevratek.h"

#include <stdio.h>
#include <stddef.h>

/* A growable NUL-terminated byte buffer. Zero-initialise to start empty. */
typedef struct {
    char  *data;
    size_t len;
    size_t cap;
} mv_buf;

int  mv_buf_reserve(mv_buf *buf, size_t extra);
int  mv_buf_append(mv_buf *buf, const char *text, size_t length);
int  mv_buf_puts(mv_buf *buf, const char *text);
int  mv_buf_put_json_string(mv_buf *buf, const char *text);
int  mv_buf_put_number(mv_buf *buf, double value);
void mv_buf_free(mv_buf *buf);

/* Locate a top-level key's value inside a JSON object; returns a borrowed pointer. */
const char *mv_json_find(const char *json, const char *key);

#endif /* MEVRATEK_INTERNAL_H */
