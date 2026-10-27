import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** مرز خطا: جلوگیری از سفید شدن کامل صفحه در صورت بروز خطای نمایش */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // پیام خطا فقط در کنسول توسعه‌دهنده ثبت می‌شود؛ داده کاربر ارسال نمی‌شود
    console.error('خطای نمایش در ریاضی‌یار ششم:', error.message);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6" dir="rtl">
          <div className="bg-white border border-rose-200 rounded-2xl p-8 max-w-md text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600 text-2xl font-extrabold">!</div>
            <h1 className="text-lg font-extrabold text-slate-900">مشکلی پیش آمد</h1>
            <p className="text-sm text-slate-600 leading-relaxed">
              متأسفانه در نمایش این بخش خطایی رخ داد. داده‌های پیشرفت شما ذخیره مانده است. صفحه را دوباره بارگذاری کنید.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition"
            >
              بارگذاری مجدد صفحه
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
