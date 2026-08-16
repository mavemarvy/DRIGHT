export type SupportedCurrency={code:string;name:string;symbol:string;locale:string};
export const currencies:SupportedCurrency[]=[
{code:"USD",name:"US Dollar",symbol:"$",locale:"en-US"},
{code:"NGN",name:"Nigerian Naira",symbol:"₦",locale:"en-NG"},
{code:"GBP",name:"British Pound",symbol:"£",locale:"en-GB"},
{code:"EUR",name:"Euro",symbol:"€",locale:"en-IE"},
{code:"KWD",name:"Kuwaiti Dinar",symbol:"د.ك",locale:"ar-KW"}];
export function formatMoney(amount:number,currency:SupportedCurrency){return new Intl.NumberFormat(currency.locale,{style:"currency",currency:currency.code}).format(amount);}
