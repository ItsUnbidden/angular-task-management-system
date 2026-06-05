import { HttpInterceptorFn } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { delay } from 'rxjs';

export const delayInterceptor: HttpInterceptorFn = (req, next) => {
  if (!environment.artificialDelay) {
    return next(req);
  }

  return next(req).pipe(delay(Math.random() * environment.delayMax + environment.delayMin));
};
