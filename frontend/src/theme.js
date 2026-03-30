export const C = {
  navy:       '#1e2d5a',
  navyHover:  '#2e4080',
  blue:       '#2563b8',
  cream:      '#e8e4dc',
  white:      '#ffffff',
  beige:      '#f2ede6',
  tan:        '#f5f0e6',
  border:     '#e2ddd6',
  borderMed:  '#ddd8d0',
  gray:       '#888888',
  grayLight:  '#f5f5f2',
  text:       '#1a1a1a',
  textMuted:  '#666666',
  textLight:  '#aaaaaa',
  // Status colors
  sResearch:  { bg:'#e3f2fd', border:'#90caf9', text:'#1565c0' },
  sApplied:   { bg:'#fff9c4', border:'#ffe082', text:'#f57f17' },
  sWaiting:   { bg:'#ffe0b2', border:'#ffb74d', text:'#e65100' },
  sOffered:   { bg:'#c8e6c9', border:'#81c784', text:'#2e7d32' },
  sActive:    { bg:'#a5d6a7', border:'#66bb6a', text:'#1b5e20' },
  sOverdue:   { bg:'#ffcdd2', border:'#ef9a9a', text:'#c62828' },
  sWaitlisted:{ bg:'#e1d5f0', border:'#b39ddb', text:'#4a148c' },
  sRejected:  { bg:'#f5c6cb', border:'#e57373', text:'#b71c1c' },
  sNotInterested: { bg:'#e0e0e0', border:'#bdbdbd', text:'#616161' },
  // Priority colors
  pHigh:      { bg:'#fce4ee', border:'#e8a0bc', text:'#7d1a40' },
  pMed:       { bg:'#fff8e1', border:'#ffe082', text:'#6d4c00' },
  pLow:       { bg:'#e8f5e9', border:'#a5d6a7', text:'#1b5e20' },
  // Chip colors
  chipBlue:   { bg:'#e8f0fd', border:'#a0b8f0', text:'#1a3a8b' },
  chipGreen:  { bg:'#e6f5ea', border:'#90c8a0', text:'#1a5c2a' },
  chipOff:    { bg:'#f5f5f2', border:'#e0ddd8', text:'#bbbbbb' },
};

export const STATUS_COLORS = {
  Researching: C.sResearch,
  Applied:     C.sApplied,
  Waiting:     C.sWaiting,
  Offered:     C.sOffered,
  Active:      C.sActive,
  Overdue:     C.sOverdue,
  Waitlisted:  C.sWaitlisted,
  Rejected:    C.sRejected,
  'Not Interested': C.sNotInterested,
};

export const PRIORITY_COLORS = {
  High:   C.pHigh,
  Medium: C.pMed,
  Low:    C.pLow,
};

export const ALL_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC'
];

export const ALL_MODELS   = ['App / On Demand','Route','Fleet','Other'];
export const ALL_SERVICES = [
  'Package/Parcel Delivery','Medical/Pharmacy (Rx)','Food Delivery',
  'Job Board/Contract Platform','Freight (Non-CDL)','Field Photography/Gig Tasks',
  'Grocery Delivery','NEMT/Senior Transport','Catering Delivery',
  'Vehicle Transport','Blood/Specimen/Lab Courier','Rideshare',
  'Moving/Hauling','Pet Transport','Auto Parts/Automotive',
  'Newspaper/Publication','Laundry/Dry Cleaning','Child Transport',
  'Document/Legal Courier','Organ/Tissue Transport','Construction/Building Supply',
  'Floral/Perishable','Alcohol Delivery','Cannabis Delivery',
  'E-commerce Returns/Reverse Logistics','Marine/Waterway Delivery'
];
export const ALL_VEHICLES = [
  'Car','SUV','Minivan','Pickup Truck','Cargo Van',
  'Box Truck','Semi-Truck','Aircraft','Bike / Scooter'
];
export const STATUSES   = ['Researching','Applied','Waiting','Offered','Active','Overdue','Waitlisted','Rejected','Not Interested'];
export const PRIORITIES  = ['High','Medium','Low'];
export const CONTACT_METHODS = [
  'Email','Phone','LinkedIn','Facebook Messenger','Instagram DM',
  'Twitter / X DM','WhatsApp','TikTok','SMS','In-Person','Other'
];
export const LOG_TYPES    = ['Phone','Email','Meeting','Note'];
export const LOG_OUTCOMES = ['Interested','Pending','Callback','Left Voicemail','No Answer','Declined'];
