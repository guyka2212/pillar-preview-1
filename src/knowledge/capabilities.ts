// Catalog of what an AI agent can realistically do (PRD section 6.3 "implicit discovery").
// Used to match process steps to agent capabilities without asking the owner "where do you need AI?".

export interface Capability {
  id: string;
  name: string;
  description: string;
  /** Hebrew cue words that hint a process step could use this capability. */
  cues: string[];
  /** Default risk notes the ranking engine must surface. */
  caution?: string;
}

export const CAPABILITIES: Capability[] = [
  {
    id: 'intake',
    name: 'קליטת פניות ומידע',
    description: 'מקבל פניות מוואטסאפ, מייל, טופס או טלפון, מסדר אותן ומעביר לגורם הנכון.',
    cues: ['פנייה', 'פניות', 'ווטסאפ', 'וואטסאפ', 'מייל', 'טלפון', 'טופס', 'מתקשרים', 'שולחים'],
  },
  {
    id: 'documents',
    name: 'קריאת מסמכים',
    description: 'קורא קבצים, הזמנות, חשבוניות או תוכניות ומחלץ מהם את הפרטים החשובים.',
    cues: ['מסמך', 'קובץ', 'pdf', 'תוכנית', 'שרטוט', 'חשבונית', 'תעודת משלוח', 'הזמנה'],
    caution: 'יכולת לקרוא מסמכים מקצועיים (כמו שרטוטים) חייבת בדיקת היתכנות לפני הבטחה.',
  },
  {
    id: 'tools',
    name: 'עבודה מול מערכות',
    description: 'מעדכן או שולף נתונים ממערכות קיימות (CRM, ERP, יומן, אקסל) לפי הרשאה.',
    cues: ['מערכת', 'אקסל', 'crm', 'erp', 'פריוריטי', 'חשבשבת', 'מקלידים', 'מעתיקים', 'מעדכנים'],
    caution: 'אין לפעול על מערכות הלקוח בלי הרשאה מפורשת ובדיקה טכנית של רפי.',
  },
  {
    id: 'followup',
    name: 'מעקב ותזכורות',
    description: 'עוקב אחרי משימות פתוחות, הצעות מחיר שלא נענו ותשלומים, ומזכיר בזמן.',
    cues: ['מעקב', 'לחזור', 'שוכחים', 'נופל בין הכיסאות', 'תזכורת', 'פתוח', 'ממתין'],
  },
  {
    id: 'drafting',
    name: 'ניסוח טיוטות',
    description: 'מכין טיוטות של הצעות מחיר, תשובות ללקוחות, סיכומים ודוחות לאישור אדם.',
    cues: ['הצעת מחיר', 'הצעה', 'מנסחים', 'כותבים', 'סיכום', 'דוח', 'תשובה'],
  },
  {
    id: 'outreach',
    name: 'פנייה יזומה',
    description: 'יוזם פנייה ללקוחות קיימים או לידים לפי כללים שהעסק קבע.',
    cues: ['לקוחות קיימים', 'לידים', 'שיווק', 'חוזרים', 'מבצע', 'נטישה'],
    caution: 'פנייה יזומה דורשת הסכמה לדיוור ובקרה על תוכן.',
  },
  {
    id: 'knowledge',
    name: 'מענה מתוך ידע העסק',
    description: 'עונה על שאלות חוזרות מתוך קטלוג, מחירון, נהלים או שאלות נפוצות.',
    cues: ['שואלים', 'שאלות', 'אותן שאלות', 'מחירון', 'קטלוג', 'זמינות', 'מלאי'],
  },
  {
    id: 'scheduling',
    name: 'תיאום ושיבוץ',
    description: 'מתאם פגישות, טכנאים, משלוחים או תורים לפי זמינות.',
    cues: ['תור', 'תורים', 'פגישה', 'יומן', 'שיבוץ', 'משלוח', 'תיאום', 'הגעה'],
  },
];

export const capabilityById = (id: string) => CAPABILITIES.find((c) => c.id === id);
