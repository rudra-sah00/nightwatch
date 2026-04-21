import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { HtmlLangSetter } from './html-lang-setter';

export async function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = 'en';
  let messages = {};

  try {
    locale = await getLocale();
    messages = await getMessages();
  } catch {
    // Fallback to English if locale detection fails
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlLangSetter locale={locale} />
      {children}
    </NextIntlClientProvider>
  );
}
