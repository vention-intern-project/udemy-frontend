const DECIMAL_PRICE = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const CURRENCY_CODE = /^[A-Z]{3}$/;

export interface LocaleCurrencyFormatInput {
  readonly price: string;
  readonly currency: string;
  readonly locale: string;
  readonly freeLabel?: string;
  readonly unavailableLabel?: string;
}

export function formatLocaleCurrency({
  price,
  currency,
  locale,
  freeLabel,
  unavailableLabel,
}: LocaleCurrencyFormatInput): string {
  const rawPrice = `${currency} ${price}`;
  if (!DECIMAL_PRICE.test(price) || !CURRENCY_CODE.test(currency))
    return unavailableLabel ?? rawPrice;
  if (/^0(?:\.0+)?$/.test(price) && freeLabel) return freeLabel;

  const [integerPart, fractionPart] = price.split('.') as [string, string | undefined];
  try {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    const decimalSeparator = new Intl.NumberFormat(locale, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })
      .formatToParts(1.1)
      .find(({ type }) => type === 'decimal')?.value;
    if (fractionPart !== undefined && !decimalSeparator) return unavailableLabel ?? rawPrice;

    const formattedParts = formatter.formatToParts(BigInt(integerPart));
    const lastIntegerIndex = formattedParts.reduce(
      (index, part, currentIndex) => (part.type === 'integer' ? currentIndex : index),
      -1,
    );
    return formattedParts
      .map(({ value }, index) =>
        index === lastIntegerIndex && fractionPart !== undefined
          ? `${value}${decimalSeparator}${fractionPart}`
          : value,
      )
      .join('');
  } catch {
    return unavailableLabel ?? rawPrice;
  }
}
