import { useToast } from '../../../hooks/useToast';
import ToastItem from './ToastItem';
import styles from './Toast.module.css';

/**
 * Bottom-right toast surface, mounted once at the app root. Renders oldest-first (top) so the
 * newest toast sits at the bottom, closest to where the eye lands.
 */
export default function ToastStack() {
  const { toasts, dismiss } = useToast();
  if (toasts.length === 0) return null;
  return (
    <div className={styles.toastStack} role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  );
}
