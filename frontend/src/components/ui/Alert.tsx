interface AlertProps {
  type: 'error' | 'success';
  message: string;
}

export function Alert({ type, message }: AlertProps) {
  return <div className={`alert alert-${type === 'error' ? 'error' : 'success'}`}>{message}</div>;
}
