import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const sb = inject(MatSnackBar);
  return next(req).pipe(catchError(err => {
    sb.open(err?.error?.message ?? 'حدث خطأ غير متوقع', 'إغلاق', { duration: 4000 });
    return throwError(() => err);
  }));
};
