import type { AbstractIntlMessages } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { HtmlLangSetter } from './html-lang-setter';
import { IntlClientWrapper } from './intl-client-wrapper';

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
