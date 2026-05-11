import { useEffect } from "react";

export default function Toast({ message, onClose }) {
  useEffect(() => {
    if (!message) {
      return undefined;
    }
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) {
    return null;
  }

  return (
    <div className="toast">
      <strong>Fake Email Notification</strong>
      <p>{message}</p>
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}
