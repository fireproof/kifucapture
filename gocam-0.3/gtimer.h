#ifndef __GTIMER_H_
#define __GTIMER_H_

#ifdef __cplusplus
extern "C" {
#endif

#include <sys/time.h>

typedef struct {
  struct timeval start;
  struct timeval finish;
} gtimer_t;

gtimer_t *create_gtimer();
void start_gtimer(gtimer_t *);
void stop_gtimer(gtimer_t *);
double elapsed_seconds(gtimer_t *);


#ifdef __cplusplus
}
#endif

#endif
 
