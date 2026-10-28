/* scalewithluv plans: the feature catalog, the 3 fixed tiers and the add-ons. DRAFT prices for Luv's review.
   The console turns a tier + add-ons into Settings rows on the client's sheet (console.feature.*, console.limit.*,
   console.model.*): the client's dashboard, manager app and bot only read those rows, never this file.
   Keys must match the dashboard (feat()), Code.gs (featureOn_/limitWhy_) and the bot (ai_extras.feature_on). */
window.SWL = (() => {
  const FEATURES = [
    {k: 'whatsapp_bot',   name: 'WhatsApp AI bot', what: 'Guest replies, bookings, reminders, owner commands'},
    {k: 'manager_app',    name: 'Manager app', what: 'Check-ins, checklists, stock, reviews, issues on the manager’s phone'},
    {k: 'geotag',         name: 'Geotag', what: 'Manager submits carry location; > 200 m from the stay is flagged'},
    {k: 'ai_insights',    name: 'AI insights', what: 'Twice-monthly analysis, pricing actions, idea board', model: 'insights'},
    {k: 'ai_market',      name: 'Google market prices', what: 'Rentals near each stay, twice a month (SerpApi)', model: 'market'},
    {k: 'property_brief', name: 'New-property brief', what: 'Owner asks about a place to add; AI weighs it', model: 'property_brief'},
    {k: 'photo_check',    name: 'AI photo check', what: 'Checklist photos checked by AI; reused photos flagged', model: 'photo_check', offByDefault: true},
    {k: 'campaigns',      name: 'WhatsApp campaigns', what: 'Template builder, image library, audience, test send'},
  ];
  const LIMITS = [
    {k: 'stays', name: 'Stays'}, {k: 'cities', name: 'Cities'}, {k: 'managers', name: 'Manager logins'},
    {k: 'logins', name: 'Dashboard logins'}, {k: 'briefs', name: 'Briefs a month'}, {k: 'ai_replies', name: 'AI replies a month'},
  ];
  const MODELS = [['claude-haiku-5-5', 'Haiku 5.5'], ['claude-sonnet-5-5', 'Sonnet 5.5'], ['claude-opus-5-5', 'Opus 5.5']];
  const DEFAULT_MODELS = {insights: 'claude-haiku-5-5', market: 'claude-haiku-5-5', property_brief: 'claude-sonnet-5-5', photo_check: 'claude-haiku-5-5'};
  // ₹ a month, plus a one-time setup. Luv's prices (27 Oct 2026): ₹10k / ₹20k / ₹30k; ≈ ₹2,000 / ₹1,333 / ₹750 a stay.
  // Volume add-ons (+5 properties ₹7,000, +2 managers ₹5,000) sit near Growth's per-stay price, so upgrading beats
  // stacking. Pro adds the photo check and campaigns so its step is features, not only volume. Meta's WhatsApp fees are billed to the client by Meta, never included.
  const TIERS = [
    {k: 'base', name: 'Base', price: 10000, blurb: 'Everything to run the stays end to end: dashboard and manager app',
     features: ['manager_app'],
     limits: {stays: 5, cities: 1, managers: 1, logins: 2, briefs: 0, ai_replies: 0}},
    {k: 'growth', name: 'Growth', price: 20000, blurb: 'A team, more stays and AI insights',
     features: ['whatsapp_bot', 'manager_app', 'geotag', 'ai_insights'],
     limits: {stays: 15, cities: 3, managers: 5, logins: 5, briefs: 0, ai_replies: 1500},
     models: {insights: 'claude-haiku-5-5'}},
    {k: 'pro', name: 'Pro', price: 30000, blurb: 'Market-grounded pricing and expansion advice',
     features: ['whatsapp_bot', 'manager_app', 'geotag', 'ai_insights', 'ai_market', 'property_brief', 'photo_check', 'campaigns'],
     limits: {stays: 40, cities: 10, managers: 15, logins: 15, briefs: 5, ai_replies: 5000},
     models: {insights: 'claude-sonnet-5-5', property_brief: 'claude-sonnet-5-5'}},
  ];
  // any tier can add a higher tier's feature; volume add-ons (stack: true) can be taken as many times as wanted
  const ADDONS = [
    {k: 'whatsapp_bot', name: 'WhatsApp AI bot (300 AI replies a month)', price: 4999, feature: 'whatsapp_bot', limits: {ai_replies: 300}},   // DRAFT price - Luv to confirm
    {k: 'stays5', name: '+5 properties', price: 7000, add: {stays: 5}, stack: true},
    {k: 'managers2', name: '+2 managers', price: 5000, add: {managers: 2}, stack: true},
    {k: 'city1', name: '+1 city', price: 2000, add: {cities: 1}, stack: true},
    {k: 'logins2', name: '+2 dashboard logins', price: 1500, add: {logins: 2}, stack: true},
    {k: 'ai_insights', name: 'AI insights', price: 4999, feature: 'ai_insights'},
    {k: 'geotag', name: 'Geotag', price: 1999, feature: 'geotag'},
    {k: 'ai_market', name: 'Google market prices', price: 3999, feature: 'ai_market'},
    {k: 'property_brief', name: 'New-property brief (5 a month)', price: 2499, feature: 'property_brief', limits: {briefs: 5}},
    {k: 'photo_check', name: 'AI photo check', price: 2999, feature: 'photo_check'},
    {k: 'campaigns', name: 'WhatsApp campaigns', price: 4999, feature: 'campaigns'},
  ];
  /* tier + add-ons -> {features: {k: on|off}, limits, models, price} */
  function compose(tierK, addonKs, overrides) {
    const t = TIERS.find(x => x.k === tierK) || TIERS[0], on = new Set(t.features), lim = {...t.limits}, models = {...DEFAULT_MODELS, ...(t.models || {})};
    let price = t.price;
    (addonKs || []).forEach(k => { const a = ADDONS.find(x => x.k === k); if (!a) return; price += a.price;
      if (a.feature) on.add(a.feature);
      Object.entries(a.limits || {}).forEach(([l, v]) => { lim[l] = Math.max(lim[l] || 0, v); });
      Object.entries(a.add || {}).forEach(([l, v]) => { lim[l] = (lim[l] || 0) + v; }); });
    const features = {};
    FEATURES.forEach(f => { features[f.k] = on.has(f.k) || f.base ? 'on' : 'off'; });
    Object.assign(features, (overrides || {}).features || {});
    return {features, limits: {...lim, ...((overrides || {}).limits || {})}, models: {...models, ...((overrides || {}).models || {})}, price};
  }
  const COSTS = {hosting_inr: 0, ai_markup_pct: 0};
  return {FEATURES, LIMITS, MODELS, DEFAULT_MODELS, TIERS, ADDONS, COSTS, compose};
})();
