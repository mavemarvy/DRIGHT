export const supportedLocales=[
{code:"en",name:"English",variant:"International"},
{code:"en-US",name:"English",variant:"US"},
{code:"en-GB",name:"English",variant:"UK"}] as const;
export type SupportedLocale=(typeof supportedLocales)[number]["code"];
