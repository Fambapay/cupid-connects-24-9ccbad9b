import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

import { template as welcomeTemplate } from './welcome'
import { template as newMatchTemplate } from './new-match'
import { template as orderConfirmationTemplate } from './order-confirmation'
import { template as notificationTemplate } from './notification'
import { template as newMessageTemplate } from './new-message'
import { template as newLikeTemplate } from './new-like'
import { template as membershipExpiringTemplate } from './membership-expiring'
import { template as reactivationTemplate } from './reactivation'
import { template as trialEndingTemplate } from './trial-ending'

export const TEMPLATES: Record<string, TemplateEntry> = {
  welcome: welcomeTemplate,
  'new-match': newMatchTemplate,
  'new-message': newMessageTemplate,
  'new-like': newLikeTemplate,
  'order-confirmation': orderConfirmationTemplate,
  notification: notificationTemplate,
  'membership-expiring': membershipExpiringTemplate,
  'trial-ending': trialEndingTemplate,
  reactivation: reactivationTemplate,
}
