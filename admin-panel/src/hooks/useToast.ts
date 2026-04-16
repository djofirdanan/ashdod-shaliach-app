import toast from 'react-hot-toast';

export const useToast = () => {
  const success = (message: string) => {
    toast.success(message, {
      style: { direction: 'rtl', fontFamily: 'inherit' },
      duration: 3000,
    });
  };

  const error = (message: string) => {
    toast.error(message, {
      style: { direction: 'rtl', fontFamily: 'inherit' },
      duration: 4000,
    });
  };

  const info = (message: string) => {
    toast(message, {
      style: { direction: 'rtl', fontFamily: 'inherit' },
      duration: 3000,
    });
  };

  const loading = (message: string) => {
    return toast.loading(message, {
      style: { direction: 'rtl', fontFamily: 'inherit' },
    });
  };

  const dismiss = (id?: string) => {
    toast.dismiss(id);
  };

  return { success, error, info, loading, dismiss };
};
