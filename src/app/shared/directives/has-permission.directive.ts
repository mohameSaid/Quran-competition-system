import {
  Directive,
  TemplateRef,
  ViewContainerRef,
  effect,
  inject,
  input,
} from '@angular/core';
import { AuthorizationService } from '../../core/services/authorization.service';
import { Permission } from '../../core/models/platform/permission.model';

/**
 * Structural directive that renders its content only when the current
 * user holds the required permission(s). Reactive: it re-evaluates when
 * either the authorization state or the bound permissions change (signals).
 *
 * @example
 * ```html
 * <button *appHasPermission="'program:create'">إضافة برنامج</button>
 * <div *appHasPermission="['report:read','report:export']; mode:'all'"></div>
 * ```
 */
@Directive({
  selector: '[appHasPermission]',
  standalone: true,
})
export class HasPermissionDirective {
  private readonly tpl = inject(TemplateRef<unknown>);
  private readonly vcr = inject(ViewContainerRef);
  private readonly authz = inject(AuthorizationService);

  readonly appHasPermission = input.required<Permission | readonly Permission[]>();
  readonly appHasPermissionMode = input<'any' | 'all'>('any');

  private rendered = false;

  constructor() {
    effect(() => {
      const value = this.appHasPermission();
      const required = Array.isArray(value) ? value : [value as Permission];
      const allowed =
        this.appHasPermissionMode() === 'all'
          ? this.authz.canAll(required)
          : this.authz.canAny(required);
      this.sync(allowed);
    });
  }

  private sync(allowed: boolean): void {
    if (allowed && !this.rendered) {
      this.vcr.createEmbeddedView(this.tpl);
      this.rendered = true;
    } else if (!allowed && this.rendered) {
      this.vcr.clear();
      this.rendered = false;
    }
  }
}
