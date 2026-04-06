import type { ReactNode } from 'react';

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ');
}

export function StatusNotice(props: {
  title?: string;
  message?: string;
  className?: string;
  titleClassName?: string;
  messageClassName?: string;
  children?: ReactNode;
}) {
  const { children, className, message, messageClassName, title, titleClassName } =
    props;

  if (!title && !message && !children) {
    return null;
  }

  return (
    <div className={className}>
      {title ? <strong className={titleClassName}>{title}</strong> : null}
      {message ? <p className={messageClassName}>{message}</p> : null}
      {children}
    </div>
  );
}

export function EmptyStateCard(props: {
  title: string;
  message: string;
  className?: string;
  titleClassName?: string;
  messageClassName?: string;
  children?: ReactNode;
}) {
  const {
    children,
    className,
    message,
    messageClassName,
    title,
    titleClassName,
  } = props;

  return (
    <article className={className}>
      <strong className={joinClassNames(titleClassName)}>{title}</strong>
      <p className={joinClassNames(messageClassName)}>{message}</p>
      {children}
    </article>
  );
}
