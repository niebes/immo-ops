#!/usr/bin/env node

// Weighted scoring calculator for immo-ops listings.
// Input: JSON on stdin or as first argument (listing data + profile criteria).
// Output: JSON score breakdown to stdout.

import { readFileSync } from 'fs';

const DEFAULT_WEIGHTS = {
  price: 0.20,
  location: 0.20,
  size: 0.15,
  condition: 0.10,
  amenities: 0.10,
  availability: 0.10,
  rules: 0.10,
  landlord: 0.05,
};

function scorePrice(listing, criteria) {
  if (!listing.kaltmiete || !criteria.max_kaltmiete) return 3.0;
  const ratio = listing.kaltmiete / criteria.max_kaltmiete;
  let score;
  if (ratio <= 1.0) score = 5.0;
  else if (ratio <= 1.1) score = 4.0;
  else if (ratio <= 1.2) score = 3.0;
  else if (ratio <= 1.3) score = 2.0;
  else score = 1.0;

  if (listing.price_per_m2 && listing.mietspiegel_avg) {
    const priceRatio = listing.price_per_m2 / listing.mietspiegel_avg;
    if (priceRatio < 0.9) score = Math.min(5.0, score + 0.5);
    else if (priceRatio > 1.1) score = Math.max(1.0, score - 0.5);
  }
  return Math.round(score * 10) / 10;
}

function scoreLocation(listing, criteria) {
  if (!listing.area) return 3.0;
  const area = listing.area.toLowerCase();
  const preferred = (criteria.preferred_areas || []).map(a => a.toLowerCase());
  const acceptable = (criteria.acceptable_areas || []).map(a => a.toLowerCase());
  const excluded = (criteria.excluded_areas || []).map(a => a.toLowerCase());

  if (excluded.some(e => area.includes(e))) return 1.0;

  let base;
  if (preferred.some(p => area.includes(p))) base = 4.5;
  else if (acceptable.some(a => area.includes(a))) base = 4.0;
  else base = 3.0;

  if (listing.commute_minutes && criteria.max_commute_minutes) {
    if (listing.commute_minutes <= 20) base = Math.min(5.0, base + 0.5);
    else if (listing.commute_minutes > criteria.max_commute_minutes) {
      const overshoot = (listing.commute_minutes - criteria.max_commute_minutes) / criteria.max_commute_minutes;
      base = Math.max(1.0, base - overshoot * 3);
    }
  }
  return Math.round(base * 10) / 10;
}

function scoreSize(listing, criteria) {
  if (!listing.m2 || !criteria.min_m2) return 3.0;
  if (listing.m2 >= criteria.min_m2 && (!criteria.max_m2 || listing.m2 <= criteria.max_m2)) return 5.0;
  if (listing.m2 >= criteria.min_m2 * 0.9) return 4.0;
  if (listing.m2 >= criteria.min_m2 * 0.8) return 2.5;
  return 1.0;
}

function scoreCondition(listing) {
  const conditionScores = {
    neubau: 5.0, erstbezug: 5.0,
    saniert: 4.0, renoviert: 4.0,
    gepflegt: 3.5,
    unrenoviert: 2.5,
    'sanierungsbedürftig': 1.5,
  };
  let score = conditionScores[(listing.condition || '').toLowerCase()] || 3.0;

  const energyAdj = { 'a+': 0.5, a: 0.5, b: 0.5, c: 0.25, d: 0, e: -0.25, f: -0.5, g: -1.0, h: -1.0 };
  if (listing.energy_class) {
    score += energyAdj[listing.energy_class.toLowerCase()] || 0;
  }
  return Math.round(Math.max(1.0, Math.min(5.0, score)) * 10) / 10;
}

function scoreAmenities(listing, criteria) {
  const mustHaves = criteria.must_haves || [];
  const niceToHaves = criteria.nice_to_haves || [];
  const has = new Set((listing.amenities || []).map(a => a.toLowerCase()));

  const mustMissing = mustHaves.filter(m => !has.has(m.toLowerCase())).length;
  if (mustMissing >= 2) return 1.0;
  if (mustMissing === 1) return 2.0;

  const niceCount = niceToHaves.filter(n => has.has(n.toLowerCase())).length;
  if (niceCount >= 3) return 5.0;
  if (niceCount >= 1) return 4.0;
  return 3.5;
}

function scoreAvailability(listing, criteria) {
  if (!listing.available_date || !criteria.earliest_move_in) return 3.0;
  const available = new Date(listing.available_date);
  const earliest = new Date(criteria.earliest_move_in);
  const latest = criteria.latest_move_in ? new Date(criteria.latest_move_in) : null;

  if (available >= earliest && (!latest || available <= latest)) return 5.0;
  const diffMonths = Math.abs((available - earliest) / (30 * 24 * 60 * 60 * 1000));
  if (diffMonths <= 1) return 4.0;
  if (diffMonths <= 2) return 2.0;
  return 1.5;
}

function scoreRules(listing, criteria) {
  if (listing.wbs_required && !criteria.has_wbs) return 1.0;
  if (listing.no_pets && criteria.has_pets) return 1.0;
  if (listing.zwischenmiete && !criteria.accepts_zwischenmiete) return 1.0;
  if (listing.befristet) return 2.0;
  if (listing.kaution_months > 3) return 2.0;
  return 5.0;
}

function scoreLandlord(listing) {
  if (listing.landlord_type === 'municipal') return 5.0;
  if (listing.landlord_type === 'corporate' && listing.landlord_reputation === 'good') return 4.0;
  if (listing.landlord_type === 'corporate' && listing.landlord_reputation === 'mixed') return 2.5;
  if (listing.landlord_type === 'private') return 3.0;
  return 3.5;
}

function calculateScore(listing, criteria, weights = DEFAULT_WEIGHTS) {
  const scores = {
    price: scorePrice(listing, criteria),
    location: scoreLocation(listing, criteria),
    size: scoreSize(listing, criteria),
    condition: scoreCondition(listing),
    amenities: scoreAmenities(listing, criteria),
    availability: scoreAvailability(listing, criteria),
    rules: scoreRules(listing, criteria),
    landlord: scoreLandlord(listing),
  };

  let global = Object.entries(scores).reduce((sum, [key, val]) => sum + val * (weights[key] || 0), 0);

  const hardBlockers = [];
  if (scores.location <= 1.0) hardBlockers.push('excluded_area');
  if (scores.rules <= 1.0) hardBlockers.push('rule_violation');
  if (scores.price <= 1.0 && listing.kaltmiete > (criteria.max_kaltmiete || Infinity) * 1.4) hardBlockers.push('price_extreme');

  if (hardBlockers.length > 0) global = Math.min(global, 2.0);

  global = Math.round(global * 10) / 10;

  return { scores, weights, global, hardBlockers };
}

const input = process.argv[2]
  ? readFileSync(process.argv[2], 'utf8')
  : readFileSync(0, 'utf8');

const { listing, criteria, weights } = JSON.parse(input);
const result = calculateScore(listing, criteria, weights);
console.log(JSON.stringify(result, null, 2));
