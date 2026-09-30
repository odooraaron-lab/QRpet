// Digital products: delivered instantly online in NZ, so shipping is free and immediate. Returns follow our
// terms (no refunds except where the law requires). Google asks for both on merchant listings.
export const DIGITAL_OFFER = {
  shippingDetails: {
    '@type': 'OfferShippingDetails',
    shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'NZD' },
    shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'NZ' },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
      transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'DAY' },
    },
  },
  hasMerchantReturnPolicy: {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: 'NZ',
    returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
  },
};
