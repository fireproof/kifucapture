#ifdef __cplusplus
extern "C" {
#endif

#include <stdlib.h>
#include <gtimer.h>

gtimer_t *create_gtimer() {
  return((gtimer_t *)malloc(sizeof(gtimer_t)));
}

void start_gtimer(gtimer_t *timer) {
  gettimeofday(&(timer->start), NULL);
}

void stop_gtimer(gtimer_t *timer) {
  gettimeofday(&(timer->finish), NULL);
}

double elapsed_seconds(gtimer_t *timer) {
  double start = timer->start.tv_sec + (timer->start.tv_usec / 1000000.0);
  double finish = timer->finish.tv_sec + (timer->finish.tv_usec / 1000000.0);
  return(finish - start);
}




#ifdef __cplusplus
}
#endif

