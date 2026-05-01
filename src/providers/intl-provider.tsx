import type { AbstractIntlMessages } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { HtmlLangSetter } from './html-lang-setter';
import { IntlClientWrapper } from './intl-client-wrapper';

/**
 * Server-side internationalization provider.
 *
 * Loads the current locale and translated messages via `next-intl/server`,
 * then wraps children with {@link IntlClientWrapper} (client-side provider)
 * and {@link HtmlLangSetter} (sets `<html lang>` and `dir` attributes).
 *
 * Falls back to English (`'en'`) if message loading fails.
 */
export async function IntlProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  let locale = 'en';
  let messages: AbstractIntlMessages = {};

  try {
    locale = await getLocale();
    messages = await getMessages();
  } catch (err) {
    console.error(
      '[IntlProvider] Failed to load messages, falling back to en:',
      err,
    );
  }

  return (
    <IntlClientWrapper locale={locale} messages={messages}>
      <HtmlLangSetter locale={locale} />
      {children}
    </IntlClientWrapper>
  );
}
