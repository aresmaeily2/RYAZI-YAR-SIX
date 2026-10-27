import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { CURRICULUM_CHAPTERS } from '../src/data/curriculumData';

/**
 * تست‌های UI: ناوبری، پاسخ‌دهی درست/غلط، نمایش بازخورد و جریان کامل آزمون
 * هر کارت پرسش با data-testid="question-<id>" مشخص می‌شود تا تعامل‌ها
 * دقیقاً روی همان کارت انجام شوند، نه اولین دکمه مشابه در صفحه.
 */

function questionCard(questionId: string): HTMLElement {
  const card = screen.getByTestId(`question-${questionId}`);
  expect(card).toBeInTheDocument();
  return card;
}

describe('نمایش اولیه و ناوبری', () => {
  it('صفحه اصلی با عنوان و هفت کارت فصل رندر می‌شود', async () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /ریاضی‌یار ششم/ })).toBeInTheDocument();
    expect(screen.getByText(/سلام دانش‌آموز پایه ششم/)).toBeInTheDocument();
    for (const ch of CURRICULUM_CHAPTERS) {
      expect(screen.getAllByText(ch.title).length).toBeGreaterThan(0);
    }
  });

  it('فایل index.html ارسالی به مرورگر RTL و فارسی است', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('dir="rtl"');
    expect(html).toContain('lang="fa"');
  });

  it('ناوبری به تب درس‌نامه و بازگشت به داشبورد کار می‌کند', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    expect(screen.getByRole('heading', { name: /الگوهای عددی و رابطه عمومی/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'داشبورد' }));
    expect(screen.getByText(/ادامه آخرین درس/)).toBeInTheDocument();
  });

  it('انتخاب فصل دیگر از سایدبار، درس اول آن فصل را نشان می‌دهد', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    await user.click(screen.getByRole('button', { name: /فصل ۲: کسر/ }));
    expect(screen.getByRole('heading', { name: /یادآوری کسر و ساده‌سازی/ })).toBeInTheDocument();
  });
});

describe('پاسخ‌دهی و بازخورد تمرین‌ها', () => {
  it('پاسخ درست عددی → پیام موفقیت، توضیح و افزایش امتیاز', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));

    const firstQuestion = CURRICULUM_CHAPTERS[0].lessons[0].questions[0];
    expect(firstQuestion.type).toBe('numeric');
    const card = questionCard(firstQuestion.id);
    const input = within(card).getByLabelText(/پاسخ عددی خود را بنویس/);
    await user.type(input, '21');
    await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));

    const feedback = within(card).getByTestId('feedback');
    expect(within(feedback).getByText(/آفرین! پاسخ درست است/)).toBeInTheDocument();
    expect(within(feedback).getByText(firstQuestion.explanation)).toBeInTheDocument();
    // امتیاز XP در هدر (پاسخ درست آسان بدون راهنمایی = ۱۵)
    expect(screen.getByTitle('امتیاز تجربه')).toHaveTextContent('۱۵');
  });

  it('پاسخ غلط MCQ → پیام نادرست + تشخیص اشتباه رایج', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    await user.click(screen.getByRole('button', { name: /فصل ۲: کسر/ }));

    const q212 = CURRICULUM_CHAPTERS[1].lessons[0].questions[1];
    expect(q212.type).toBe('mcq');
    if (q212.type !== 'mcq') return;
    const wrongOption = q212.misconceptions[0].wrongOptionValue;
    const card = questionCard(q212.id);
    await user.click(within(card).getByRole('radio', { name: wrongOption }));
    await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));

    const feedback = within(card).getByTestId('feedback');
    expect(within(feedback).getByText(/پاسخ نادرست است/)).toBeInTheDocument();
    expect(within(feedback).getByText(/علت اشتباه رایج/)).toBeInTheDocument();
  });

  it('بدون انتخاب گزینه، پیام خطا نشان داده می‌شود', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    await user.click(screen.getByRole('button', { name: /فصل ۴: تقارن و مختصات/ }));
    const q411 = CURRICULUM_CHAPTERS[3].lessons[0].questions[0];
    const card = questionCard(q411.id);
    await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    expect(within(card).getByText('ابتدا یک گزینه انتخاب کن.')).toBeInTheDocument();
  });

  it('پاسخ عددی خالی پذیرفته نمی‌شود', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    const q111 = CURRICULUM_CHAPTERS[0].lessons[0].questions[0];
    const card = questionCard(q111.id);
    await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    expect(within(card).getByText('پاسخ عددی را وارد کن.')).toBeInTheDocument();
  });

  it('دکمه راهنمایی سه مرحله پله‌ای نشان می‌دهد و بعد از ۳ بار غیرفعال می‌شود', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    await user.click(screen.getByRole('button', { name: /فصل ۲: کسر/ }));
    const q211 = CURRICULUM_CHAPTERS[1].lessons[0].questions[0];
    const card = questionCard(q211.id);
    const hintButton = within(card).getByRole('button', { name: /دریافت راهنمایی/ });
    await user.click(hintButton);
    expect(within(card).getByText(/راهنمایی ۱:/)).toBeInTheDocument();
    await user.click(hintButton);
    await user.click(hintButton);
    expect(within(card).getByText(/راهنمایی ۳:/)).toBeInTheDocument();
    expect(hintButton).toBeDisabled();
  });
});

describe('جریان کامل آزمون', () => {
  it('آزمون موضوعی فصل: پاسخ درست به همه، نمره ۱۰۰٪ و مرور پاسخ‌ها', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'آزمون' }));
    await user.click(screen.getByRole('button', { name: /فصل ۱: عدد و الگوهای عددی/ }));

    const ch1Questions = CURRICULUM_CHAPTERS[0].lessons.flatMap((l) => l.questions);
    for (const q of ch1Questions) {
      const card = questionCard(q.id);
      if (q.type === 'mcq') {
        await user.click(within(card).getByRole('radio', { name: q.correctAnswer }));
      } else {
        await user.type(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), q.acceptedAnswers[0]);
      }
      await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    }

    await user.click(screen.getByRole('button', { name: /پایان آزمون و محاسبه نمره/ }));
    expect(screen.getByText(/نتیجه آزمون/)).toBeInTheDocument();
    expect(screen.getByText('٪۱۰۰')).toBeInTheDocument();
    expect(screen.getByText(/عالی! تسلط شما درخشان است/)).toBeInTheDocument();
  });

  it('آزمون با پاسخ‌های غلط: نمره صفر، مرور با پاسخ درست و تمرین مجدد غلط‌ها', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'آزمون' }));
    await user.click(screen.getByRole('button', { name: /فصل ۷: تقریب و تخمین/ }));

    const ch7Questions = CURRICULUM_CHAPTERS[6].lessons.flatMap((l) => l.questions);
    for (const q of ch7Questions) {
      const card = questionCard(q.id);
      if (q.type === 'mcq') {
        const wrong = q.options.find((o) => o !== q.correctAnswer);
        await user.click(within(card).getByRole('radio', { name: wrong! }));
      } else {
        await user.type(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), '999999');
      }
      await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    }

    await user.click(screen.getByRole('button', { name: /پایان آزمون و محاسبه نمره/ }));
    expect(screen.getByText('٪۰')).toBeInTheDocument();
    expect(screen.getByText(/نیازمند تمرین بیشتر/)).toBeInTheDocument();

    // در مرور، پاسخ درست هم نمایش داده می‌شود
    const q711 = ch7Questions[0];
    expect(q711.type).toBe('mcq');
    if (q711.type === 'mcq') {
      const reviewCard = screen.getByTestId(`question-${q711.id}`);
      const correctLine = within(reviewCard).getByText(/پاسخ درست:/);
      expect(correctLine).toHaveTextContent(q711.correctAnswer);
    }

    // تمرین مجدد فقط غلط‌ها → بازگشت به حالت اجرا با ۸ پرسش
    await user.click(screen.getByRole('button', { name: /تمرین مجدد فقط سؤال‌های غلط/ }));
    const header = screen.getByText(/پرسش پاسخ داده شده/).closest('p');
    expect(header).toHaveTextContent('۰ از ۸ پرسش پاسخ داده شده');
  });

  it('هشدار بی‌پاسخ‌ها در نتیجه آزمون نمایش داده می‌شود', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'آزمون' }));
    await user.click(screen.getByRole('button', { name: /فصل ۷: تقریب و تخمین/ }));
    // بدون پاسخ دادن، مستقیم پایان آزمون
    await user.click(screen.getByRole('button', { name: /پایان آزمون و محاسبه نمره/ }));
    expect(screen.getByText('۸')).toBeInTheDocument(); // ستون بی‌پاسخ
  });
});

describe('گزارش پیشرفت و پایداری داده', () => {
  it('تب گزارش با حالت خالی و پیام حریم خصوصی رندر می‌شود', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /گزارش پیشرفت/ }));
    expect(screen.getByText(/گزارش تحلیلی پیشرفت و تشخیص خطاها/)).toBeInTheDocument();
    expect(screen.getByText(/هنوز خطای تشخیص‌داده‌شده‌ای ثبت نشده است/)).toBeInTheDocument();
    expect(screen.getByText(/حریم خصوصی/)).toBeInTheDocument();
  });

  it('وضعیت پس از رفرش صفحه از localStorage بازیابی می‌شود', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(screen.getByRole('button', { name: 'درس‌نامه و تمرین' }));
    const q111 = CURRICULUM_CHAPTERS[0].lessons[0].questions[0];
    const card = questionCard(q111.id);
    await user.type(within(card).getByLabelText(/پاسخ عددی خود را بنویس/), '21');
    await user.click(within(card).getByRole('button', { name: /بررسی و تصحیح پاسخ/ }));
    unmount();

    render(<App />);
    await user.click(screen.getByRole('button', { name: /گزارش پیشرفت/ }));
    const attemptsCard = screen.getByText('کل تلاش‌ها').parentElement;
    expect(attemptsCard).toHaveTextContent('۱');
    const xpBadge = screen.getByTitle('امتیاز تجربه');
    expect(xpBadge).toHaveTextContent('۱۵');
  });
});
