// Industry knowledge base for the five starter industries.
// Opportunity templates are hypotheses to test with the owner, never facts about their business.

import type { Gap, IndustryId, Level, RiskProfile, ScoreInputs } from '../types';

export interface OpportunityTemplate {
  id: string;
  name: string;
  problem: string;
  /** Hebrew words in the conversation or materials that make this template relevant. */
  triggers: string[];
  capabilityIds: string[];
  today: string;
  after: string;
  humanRole: string;
  agentRole: string;
  needs: string[];
  kpi: string;
  scores: ScoreInputs;
  risks: RiskProfile;
  complexity: Level;
  /** Short business-language pitch used when proposing the idea as a hypothesis. */
  pitch: string;
  nonMonetary: string[];
}

export interface Industry {
  id: IndustryId;
  name: string;
  keywords: string[];
  typicalProcesses: { name: string; steps: string[] }[];
  questions: { gap: Gap; text: string }[];
  templates: OpportunityTemplate[];
  /** Realistic owner lines used by the scenario fixtures. */
  sample: {
    business: string;
    siteText: string;
    processLine: string;
    peopleLine: string;
    painLine: string;
    numbersLine: string;
  };
}

const lowRisk: RiskProfile = { sensitiveData: 'low', professionalJudgment: 'low', irreversibleAction: 'low', dataCorrectness: 'medium' };

export const INDUSTRIES: Industry[] = [
  {
    id: 'manufacturing',
    name: 'ייצור ופרויקטים לפי הזמנה',
    keywords: ['מפעל', 'ייצור', 'שרטוט', 'תוכניות', 'מהנדס', 'פרויקט', 'מסגרות', 'עיבוד', 'רכש'],
    typicalProcesses: [
      { name: 'מבקשה להצעת מחיר', steps: ['קבלת בקשה ותוכניות', 'בדיקת חוסרים', 'שיחות השלמה', 'תמחור', 'שליחת הצעה'] },
      { name: 'מהזמנה לאספקה', steps: ['אישור הזמנה', 'רכש חומרים', 'תכנון ייצור', 'ייצור', 'בקרת איכות', 'משלוח'] },
    ],
    questions: [
      { gap: 'workflow', text: 'אני סקרן איך בקשה של לקוח הופכת אצלכם להצעת מחיר. מה קורה מהרגע שהיא מגיעה?' },
      { gap: 'people', text: 'מי מטפל בבקשה ראשון, ולמה דווקא הוא?' },
      { gap: 'decisions', text: 'איפה בתהליך נדרש הכי הרבה שיקול דעת של המהנדס?' },
      { gap: 'exceptions', text: 'מה קורה כשחסרים פרטים בתוכניות? איך זה נראה בפועל?' },
      { gap: 'volume', text: 'בערך כמה בקשות להצעת מחיר מגיעות בחודש?' },
      { gap: 'time', text: 'כמה זמן לוקח בממוצע להכין הצעה אחת, כולל השיחות להשלמת פרטים?' },
    ],
    templates: [
      {
        id: 'mfg-gap-list',
        name: 'רשימת חוסרים אוטומטית לפני תמחור',
        problem: 'מהנדסים משקיעים זמן בזיהוי פרטים חסרים בבקשות לפני שאפשר לתמחר.',
        triggers: ['חסר', 'חוסרים', 'פרטים', 'תוכניות', 'שרטוט', 'מהנדס', 'בירור'],
        capabilityIds: ['documents', 'drafting'],
        today: 'מהנדס קורא כל בקשה, מזהה מה חסר ומתקשר ללקוח כדי להשלים.',
        after: 'הסוכן מכין רשימת חוסרים ראשונית וטיוטת פנייה ללקוח; המהנדס בודק ומאשר.',
        humanRole: 'המהנדס מאשר את רשימת החוסרים ומחליט על התמחור.',
        agentRole: 'קריאת הבקשה, השוואה לצ׳קליסט, ניסוח שאלות השלמה.',
        needs: ['דוגמאות לבקשות עבר', 'צ׳קליסט פרטים נדרשים', 'בדיקת היתכנות לקריאת תוכניות'],
        kpi: 'זמן מקבלת בקשה ועד הצעה',
        scores: { value: 4, feasibility: 3, impact: 4, data: 3, speed: 3 },
        risks: { sensitiveData: 'low', professionalJudgment: 'high', irreversibleAction: 'low', dataCorrectness: 'medium' },
        complexity: 'medium',
        pitch: 'אפשרות אחת היא להכין רשימת חוסרים ראשונית שהמהנדס רק בודק. לא בטוח שזה מתאים לכל תוכנית.',
        nonMonetary: ['זמן תגובה קצר יותר ללקוח', 'פחות סבבי בירור'],
      },
      {
        id: 'mfg-quote-followup',
        name: 'מעקב אחרי הצעות מחיר פתוחות',
        problem: 'הצעות מחיר שנשלחו לא תמיד מקבלות מעקב, ועסקאות הולכות לאיבוד.',
        triggers: ['הצעה', 'הצעות', 'לא חזרו', 'מעקב', 'שוכחים', 'סגירה'],
        capabilityIds: ['followup', 'drafting'],
        today: 'מעקב אחרי הצעות נעשה מהזיכרון או מאקסל, כשיש זמן.',
        after: 'הסוכן מזכיר מתי לחזור, מכין טיוטת הודעה, ומסמן הצעות בסיכון.',
        humanRole: 'איש המכירות מחליט אם ומתי לפנות.',
        agentRole: 'מעקב סטטוס, תזכורות, טיוטות הודעה.',
        needs: ['רשימת הצעות פתוחות', 'גישה לקריאה מהמקום שבו ההצעות נשמרות'],
        kpi: 'שיעור המרה של הצעות מחיר',
        scores: { value: 4, feasibility: 4, impact: 3, data: 3, speed: 4 },
        risks: lowRisk,
        complexity: 'low',
        pitch: 'עולה לי כיוון: מעקב שקט אחרי הצעות שנשלחו, עם תזכורת וטיוטה מוכנה. רוצה שנבדוק יחד אם זה רלוונטי אצלכם?',
        nonMonetary: ['שליטה ניהולית על הצנרת', 'פחות עסקאות שנופלות'],
      },
      {
        id: 'mfg-order-status',
        name: 'מענה לשאלות "איפה ההזמנה שלי"',
        problem: 'לקוחות מתקשרים לשאול על סטטוס ההזמנה ומפריעים לצוות הייצור.',
        triggers: ['סטטוס', 'איפה ההזמנה', 'מתקשרים', 'מועד אספקה', 'מתי'],
        capabilityIds: ['knowledge', 'tools', 'intake'],
        today: 'מישהו מהמשרד בודק בייצור ועונה ללקוח בטלפון.',
        after: 'הסוכן עונה לפי נתוני הסטטוס במערכת ומעביר לאדם רק חריגים.',
        humanRole: 'המשרד מטפל בחריגים ובלקוחות לא מרוצים.',
        agentRole: 'שליפת סטטוס ומענה ראשוני.',
        needs: ['מקום אחד שבו מתעדכן סטטוס ייצור', 'אינטגרציה לקריאה בלבד'],
        kpi: 'מספר שיחות סטטוס שמגיעות לצוות',
        scores: { value: 3, feasibility: 3, impact: 3, data: 2, speed: 3 },
        risks: lowRisk,
        complexity: 'medium',
        pitch: 'אפשר לחשוב על מענה אוטומטי לשאלות סטטוס, בתנאי שהסטטוס מתועד במקום אחד. איך זה נשמע לך?',
        nonMonetary: ['פחות הפרעות לייצור', 'לקוח מקבל תשובה מיד'],
      },
    ],
    sample: {
      business: 'מפעל מסגרות לפרויקטים מותאמים',
      siteText: 'אנחנו מפעל מסגרות ותיק המתמחה בפרויקטים מותאמים אישית לפי תוכניות הלקוח. אספקה לכל הארץ.',
      processLine: 'המהנדסים עוברים על התוכניות, מתקשרים להשלים פרטים חסרים ואז מכינים הצעת מחיר.',
      peopleLine: 'יש לנו שני מהנדסים, ובעיקר יוסי עושה את זה.',
      painLine: 'בעיקר להבין מה חסר בתוכניות, זה לוקח הכי הרבה זמן.',
      numbersLine: 'מגיעות בערך 80 בקשות בחודש, וכל אחת לוקחת בערך 90 דקות.',
    },
  },
  {
    id: 'retail',
    name: 'קמעונאות וחנות אונליין',
    keywords: ['חנות', 'אתר', 'מוצרים', 'מלאי', 'משלוחים', 'החזרות', 'קטלוג', 'הזמנות אונליין'],
    typicalProcesses: [
      { name: 'שירות לקוחות', steps: ['קבלת שאלה', 'בדיקת הזמנה/מלאי', 'מענה', 'טיפול בהחזרה'] },
      { name: 'ניהול מלאי וקטלוג', steps: ['קליטת סחורה', 'עדכון מלאי', 'עדכון אתר', 'הזמנה מספקים'] },
    ],
    questions: [
      { gap: 'workflow', text: 'ספר לי איך נראית שאלה טיפוסית של לקוח מהרגע שהיא מגיעה ועד שהוא מקבל תשובה.' },
      { gap: 'people', text: 'מי עונה ללקוחות היום, ואיך מתחלקת העבודה ביניכם?' },
      { gap: 'exceptions', text: 'אילו פניות הכי מסובכות לכם, ולמה?' },
      { gap: 'systems', text: 'איפה נשמרים פרטי ההזמנות והמלאי — באתר, באקסל, במערכת אחרת?' },
      { gap: 'volume', text: 'כמה פניות של לקוחות יש בערך בחודש?' },
      { gap: 'time', text: 'כמה דקות לוקח בממוצע לענות לפנייה אחת?' },
    ],
    templates: [
      {
        id: 'ret-faq-agent',
        name: 'מענה ראשוני לשאלות חוזרות של לקוחות',
        problem: 'הצוות עונה שוב ושוב על אותן שאלות: משלוח, מידות, זמינות, החזרות.',
        triggers: ['שואלים', 'אותן שאלות', 'משלוח', 'מידות', 'זמינות', 'החזרה', 'וואטסאפ', 'ווטסאפ'],
        capabilityIds: ['knowledge', 'intake'],
        today: 'כל שאלה נענית ידנית בוואטסאפ או במייל.',
        after: 'הסוכן עונה על שאלות חוזרות מתוך מדיניות החנות ומעביר לאדם שאלות חריגות.',
        humanRole: 'הצוות מטפל בחריגים ובתלונות.',
        agentRole: 'מענה מתוך שאלות נפוצות, מדיניות וקטלוג.',
        needs: ['מדיניות משלוחים והחזרות כתובה', 'קטלוג מעודכן', 'ערוץ פניות מרכזי'],
        kpi: 'זמן תגובה ראשונה ושיעור פניות שנפתרו בלי אדם',
        scores: { value: 3, feasibility: 5, impact: 3, data: 4, speed: 5 },
        risks: lowRisk,
        complexity: 'low',
        pitch: 'כיוון אחד: מענה ראשוני לשאלות החוזרות, כשכל דבר חריג עובר אליכם. מה דעתך?',
        nonMonetary: ['תשובה גם מחוץ לשעות העבודה', 'עקביות בתשובות'],
      },
      {
        id: 'ret-abandoned',
        name: 'חזרה ללקוחות שנטשו עגלה או שאלו ולא קנו',
        problem: 'לקוחות שהתעניינו ולא השלימו רכישה לא מקבלים המשך טיפול.',
        triggers: ['נטשו', 'לא קנו', 'עגלה', 'שאלו ולא', 'לידים', 'התעניינו'],
        capabilityIds: ['outreach', 'followup', 'drafting'],
        today: 'אין טיפול שיטתי במתעניינים שלא קנו.',
        after: 'הסוכן מזהה מתעניינים ושולח הודעת המשך מותאמת, לפי הסכמת דיוור.',
        humanRole: 'בעל העסק קובע כללים ותוכן מותר.',
        agentRole: 'זיהוי, ניסוח ושליחת הודעות המשך.',
        needs: ['הסכמת דיוור', 'נתוני עגלות/פניות', 'אישור תוכן'],
        kpi: 'הכנסה מלקוחות שחזרו',
        scores: { value: 4, feasibility: 4, impact: 3, data: 3, speed: 4 },
        risks: { sensitiveData: 'medium', professionalJudgment: 'low', irreversibleAction: 'medium', dataCorrectness: 'low' },
        complexity: 'low',
        pitch: 'אולי יש כאן הזדמנות הכנסה: חזרה עדינה למי שהתעניין ולא קנה. רוצה שנבדוק אם יש מספיק כאלה?',
        nonMonetary: ['הבנה למה לקוחות לא קונים'],
      },
      {
        id: 'ret-catalog',
        name: 'עדכון קטלוג ומלאי מתוך תעודות משלוח',
        problem: 'עדכון מלאי ותיאורי מוצרים באתר נעשה ידנית ולוקח זמן.',
        triggers: ['מלאי', 'קטלוג', 'עדכון', 'תעודת משלוח', 'ספקים', 'מקלידים'],
        capabilityIds: ['documents', 'tools', 'drafting'],
        today: 'מישהו מקליד תעודות משלוח ומעדכן את האתר.',
        after: 'הסוכן קורא את התעודה, מכין עדכון מלאי וטיוטת תיאור מוצר לאישור.',
        humanRole: 'אישור לפני פרסום באתר.',
        agentRole: 'קריאת מסמכים והכנת עדכונים.',
        needs: ['פורמט תעודות משלוח', 'גישה לממשק האתר', 'בדיקה טכנית'],
        kpi: 'זמן מקבלת סחורה ועד שהיא באתר',
        scores: { value: 3, feasibility: 3, impact: 2, data: 3, speed: 3 },
        risks: { sensitiveData: 'low', professionalJudgment: 'low', irreversibleAction: 'medium', dataCorrectness: 'high' },
        complexity: 'medium',
        pitch: 'אפשרות נוספת היא שהסוכן יכין את עדכוני המלאי מתוך תעודות המשלוח ואתם רק מאשרים. זה רלוונטי?',
        nonMonetary: ['פחות טעויות הקלדה', 'מוצרים עולים לאתר מהר יותר'],
      },
    ],
    sample: {
      business: 'חנות אונליין לבגדי ילדים',
      siteText: 'חנות בגדי ילדים אונליין עם משלוחים לכל הארץ, החזרה חינם תוך 14 יום.',
      processLine: 'לקוחות שואלים בוואטסאפ על מידות ומשלוחים, ואני או העובדת עונות.',
      peopleLine: 'אני ועוד עובדת אחת, היא עונה בעיקר בבוקר.',
      painLine: 'זה בעיקר אותן שאלות שוב ושוב, על מידות ועל זמני משלוח.',
      numbersLine: 'יש בערך 600 פניות בחודש, כל אחת לוקחת בערך 4 דקות.',
    },
  },
  {
    id: 'clinic',
    name: 'קליניקות ומרפאות פרטיות',
    keywords: ['קליניקה', 'מרפאה', 'מטופלים', 'תורים', 'טיפול', 'רופא', 'פיזיותרפיה', 'אסתטיקה'],
    typicalProcesses: [
      { name: 'קביעת תורים', steps: ['פנייה', 'בדיקת זמינות', 'קביעת תור', 'תזכורת', 'טיפול באי-הגעה'] },
      { name: 'מעקב מטופלים', steps: ['טיפול', 'סיכום', 'המלצה להמשך', 'חזרה למטופל'] },
    ],
    questions: [
      { gap: 'workflow', text: 'איך מטופל חדש מגיע אליכם, ומה קורה עד שהוא יושב אצלכם בטיפול?' },
      { gap: 'people', text: 'מי מתאם את התורים היום, וכמה מהזמן שלו זה תופס?' },
      { gap: 'exceptions', text: 'מה קורה כשמטופל מבטל או לא מגיע?' },
      { gap: 'systems', text: 'באיזה יומן או מערכת אתם מנהלים תורים?' },
      { gap: 'volume', text: 'כמה תורים בערך נקבעים בחודש, וכמה מהם מתבטלים?' },
      { gap: 'mustNotHarm', text: 'מה חשוב לכם שלא ישתנה ביחס עם המטופלים?' },
    ],
    templates: [
      {
        id: 'cli-scheduling',
        name: 'תיאום תורים ותזכורות',
        problem: 'תיאום תורים בטלפון גוזל זמן, ואי-הגעות משאירות חורים ביומן.',
        triggers: ['תור', 'תורים', 'ביטול', 'לא מגיע', 'יומן', 'מתקשרים', 'תזכורת'],
        capabilityIds: ['scheduling', 'intake', 'followup'],
        today: 'המזכירה עונה לטלפון, בודקת ביומן ומתקשרת לתזכר.',
        after: 'הסוכן מציע מועדים, שולח תזכורות וממלא ביטולים מרשימת המתנה.',
        humanRole: 'המזכירה מטפלת במקרים רגישים ובשאלות רפואיות.',
        agentRole: 'תיאום, תזכורות ורשימת המתנה — בלי ייעוץ רפואי.',
        needs: ['גישה ליומן', 'הסכמה לשליחת הודעות', 'כללי תיאום'],
        kpi: 'שיעור אי-הגעה וזמן מזכירות על תיאום',
        scores: { value: 4, feasibility: 4, impact: 4, data: 3, speed: 4 },
        risks: { sensitiveData: 'medium', professionalJudgment: 'low', irreversibleAction: 'low', dataCorrectness: 'medium' },
        complexity: 'low',
        pitch: 'עולה לי כיוון שאולי יחסוך חלק מהעבודה: תיאום ותזכורות אוטומטיים, עם רשימת המתנה לביטולים. רוצה שנבדוק אם זה מתאים?',
        nonMonetary: ['יומן מלא יותר', 'פחות לחץ על המזכירות'],
      },
      {
        id: 'cli-recall',
        name: 'חזרה למטופלים שצריכים טיפול המשך',
        problem: 'מטופלים שהומלץ להם על המשך לא תמיד חוזרים, ואין מעקב שיטתי.',
        triggers: ['המשך', 'חוזרים', 'לא חזרו', 'סדרה', 'מעקב'],
        capabilityIds: ['followup', 'outreach'],
        today: 'אין תזכורת שיטתית לטיפולי המשך.',
        after: 'הסוכן מזכיר למטופלים בעדינות לפי ההמלצה שנרשמה, באישור הקליניקה.',
        humanRole: 'המטפל קובע את ההמלצה; הקליניקה מאשרת את הנוסח.',
        agentRole: 'מעקב ותזכורת בלבד.',
        needs: ['רישום המלצות המשך', 'הסכמת מטופלים', 'נוסח מאושר'],
        kpi: 'שיעור מטופלים שחזרו לטיפול המשך',
        scores: { value: 4, feasibility: 4, impact: 3, data: 2, speed: 4 },
        risks: { sensitiveData: 'high', professionalJudgment: 'medium', irreversibleAction: 'low', dataCorrectness: 'medium' },
        complexity: 'low',
        pitch: 'אפשרות נוספת: תזכורת עדינה למטופלים שהומלץ להם על המשך. לא בטוח שזה מתאים לאופי הקליניקה — מה אתה חושב?',
        nonMonetary: ['רצף טיפולי טוב יותר'],
      },
      {
        id: 'cli-intake-forms',
        name: 'קליטת שאלון למטופל חדש לפני הטיפול',
        problem: 'איסוף פרטים ושאלונים נעשה בתחילת הטיפול ומקצר את זמן הטיפול עצמו.',
        triggers: ['שאלון', 'טופס', 'פרטים', 'מטופל חדש', 'קליטה'],
        capabilityIds: ['intake', 'drafting'],
        today: 'המטופל ממלא טופס נייר במקום, והמטפל קורא אותו בתחילת הטיפול.',
        after: 'הסוכן אוסף את השאלון מראש ומכין סיכום קצר למטפל.',
        humanRole: 'המטפל מפרש את המידע — הסוכן לא מאבחן.',
        agentRole: 'איסוף וסידור מידע בלבד.',
        needs: ['שאלון קיים', 'אבטחת מידע רפואי', 'הסכמה מדעת'],
        kpi: 'דקות טיפול שמתפנות לכל מטופל חדש',
        scores: { value: 3, feasibility: 3, impact: 3, data: 3, speed: 3 },
        risks: { sensitiveData: 'high', professionalJudgment: 'high', irreversibleAction: 'low', dataCorrectness: 'medium' },
        complexity: 'medium',
        pitch: 'אולי אפשר לאסוף את השאלון לפני ההגעה ולהכין למטפל סיכום קצר. זה כיוון שמעניין אותך?',
        nonMonetary: ['יותר זמן טיפול בפועל'],
      },
    ],
    sample: {
      business: 'קליניקת פיזיותרפיה',
      siteText: 'קליניקת פיזיותרפיה מתקדמת. קביעת תורים בטלפון בשעות 8–19.',
      processLine: 'מטופלים מתקשרים, המזכירה בודקת ביומן וקובעת תור, ויום לפני מתקשרת לתזכר.',
      peopleLine: 'יש מזכירה אחת ושלושה פיזיותרפיסטים.',
      painLine: 'הכי מתסכל זה ביטולים ברגע האחרון, נשארים חורים ביומן.',
      numbersLine: 'יש בערך 700 תורים בחודש, ותיאום של כל תור לוקח בערך 5 דקות.',
    },
  },
  {
    id: 'construction',
    name: 'קבלנות, שיפוצים ובנייה',
    keywords: ['קבלן', 'שיפוץ', 'בנייה', 'אתר עבודה', 'קבלני משנה', 'כתב כמויות', 'הצעת מחיר', 'פיקוח'],
    typicalProcesses: [
      { name: 'מפנייה לחוזה', steps: ['פנייה', 'סיור באתר', 'כתב כמויות', 'הצעת מחיר', 'משא ומתן', 'חוזה'] },
      { name: 'ניהול ביצוע', steps: ['תכנון לו״ז', 'תיאום קבלני משנה', 'רכש', 'דיווח התקדמות', 'חשבון חלקי'] },
    ],
    questions: [
      { gap: 'workflow', text: 'מה קורה מהרגע שלקוח פונה אליכם ועד שנחתם חוזה?' },
      { gap: 'people', text: 'מי מכין את כתב הכמויות ואת ההצעה, ואיך זה מתחלק?' },
      { gap: 'decisions', text: 'איפה ההחלטות הכי קשות בתמחור, ולמה?' },
      { gap: 'exceptions', text: 'מה בדרך כלל משבש את לוח הזמנים בפרויקט?' },
      { gap: 'volume', text: 'כמה הצעות מחיר אתם מכינים בחודש, וכמה מהן נסגרות?' },
      { gap: 'time', text: 'כמה שעות לוקח להכין הצעה אחת?' },
    ],
    templates: [
      {
        id: 'con-subcontractor-coord',
        name: 'תיאום קבלני משנה ועדכוני לו״ז',
        problem: 'מנהל העבודה מבזבז שעות בטלפונים לתיאום קבלני משנה ומעקב התקדמות.',
        triggers: ['קבלני משנה', 'תיאום', 'לו"ז', 'לוח זמנים', 'טלפונים', 'מאחרים', 'מעקב'],
        capabilityIds: ['scheduling', 'followup', 'intake'],
        today: 'מנהל העבודה מתקשר לכל קבלן משנה ומעדכן את הלו״ז בראש או באקסל.',
        after: 'הסוכן שולח תזכורות, אוסף אישורי הגעה ומתריע על עיכובים.',
        humanRole: 'מנהל העבודה מחליט על שינויים בלו״ז.',
        agentRole: 'תזכורות, איסוף אישורים, התראות.',
        needs: ['רשימת קבלני משנה ואנשי קשר', 'לו״ז פרויקט', 'ערוץ הודעות'],
        kpi: 'ימי עיכוב לפרויקט ושעות תיאום בשבוע',
        scores: { value: 4, feasibility: 4, impact: 4, data: 3, speed: 4 },
        risks: lowRisk,
        complexity: 'low',
        pitch: 'כיוון שעולה לי: הסוכן אוסף אישורים מקבלני המשנה ומתריע כשמשהו זז, ומנהל העבודה מחליט. איך זה נשמע?',
        nonMonetary: ['שליטה טובה יותר בפרויקטים', 'פחות הפתעות'],
      },
      {
        id: 'con-quote-draft',
        name: 'טיוטת הצעת מחיר מתוך סיור וכתב כמויות',
        problem: 'הכנת הצעות מחיר לוקחת הרבה זמן ונדחית, ולקוחות הולכים למתחרים.',
        triggers: ['הצעת מחיר', 'כתב כמויות', 'תמחור', 'סיור', 'מחכים להצעה'],
        capabilityIds: ['drafting', 'documents'],
        today: 'הקבלן כותב הצעה בערב, מתוך רשימות מהסיור.',
        after: 'הסוכן מכין טיוטה מתוך סיכום הסיור ומחירון העסק; הקבלן מתמחר ומאשר.',
        humanRole: 'הקבלן קובע מחירים וכמויות סופיים.',
        agentRole: 'ארגון רשימות וניסוח טיוטה.',
        needs: ['מחירון פנימי', 'דוגמאות הצעות עבר', 'תבנית הצעה'],
        kpi: 'זמן מסיור ועד הצעה',
        scores: { value: 4, feasibility: 3, impact: 3, data: 3, speed: 3 },
        risks: { sensitiveData: 'low', professionalJudgment: 'high', irreversibleAction: 'low', dataCorrectness: 'high' },
        complexity: 'medium',
        pitch: 'אולי אפשר לקצר את הדרך מהסיור להצעה עם טיוטה מוכנה שאתה רק מתמחר. רוצה שנבדוק אם זה חוסך משהו אמיתי?',
        nonMonetary: ['הצעות יוצאות מהר יותר', 'מראה מקצועי אחיד'],
      },
      {
        id: 'con-lead-intake',
        name: 'סינון פניות של לקוחות חדשים',
        problem: 'הרבה פניות לא רלוונטיות גוזלות זמן לסיורים מיותרים.',
        triggers: ['פניות', 'לא רלוונטי', 'סיורים', 'תקציב', 'סינון'],
        capabilityIds: ['intake', 'knowledge'],
        today: 'הקבלן עונה לכל פנייה ונוסע לסיור גם כשאין התאמה.',
        after: 'הסוכן אוסף פרטים בסיסיים (סוג עבודה, אזור, לוח זמנים) לפני תיאום סיור.',
        humanRole: 'הקבלן מחליט על מי לנסוע.',
        agentRole: 'שאלות סינון וסיכום פנייה.',
        needs: ['קריטריונים להתאמה', 'ערוץ קבלת פניות'],
        kpi: 'שיעור סיורים שהפכו להצעה',
        scores: { value: 3, feasibility: 5, impact: 3, data: 4, speed: 5 },
        risks: lowRisk,
        complexity: 'low',
        pitch: 'אפשרות נוספת: לאסוף כמה פרטים בסיסיים לפני שנוסעים לסיור. זה מתאים לאיך שאתם עובדים?',
        nonMonetary: ['פחות נסיעות מיותרות'],
      },
    ],
    sample: {
      business: 'קבלן שיפוצים',
      siteText: 'שיפוצים כלליים לדירות ומשרדים, עבודה עם צוות קבלני משנה קבוע.',
      processLine: 'אחרי שנחתם חוזה אני מתאם את קבלני המשנה בטלפון ובודק כל יום מי מגיע.',
      peopleLine: 'אני ומנהל עבודה אחד, ועוד כעשרה קבלני משנה.',
      painLine: 'הכי קשה זה שקבלני משנה לא מגיעים ואני מגלה ברגע האחרון.',
      numbersLine: 'יש בערך 120 תיאומים בחודש, כל אחד לוקח בערך 15 דקות.',
    },
  },
  {
    id: 'logistics',
    name: 'הפצה, לוגיסטיקה ומחסנים',
    keywords: ['הפצה', 'משלוחים', 'מחסן', 'נהגים', 'מסלולים', 'תעודת משלוח', 'לקוחות עסקיים', 'הזמנות'],
    typicalProcesses: [
      { name: 'מהזמנה למשלוח', steps: ['קבלת הזמנה', 'הקלדה למערכת', 'ליקוט', 'שיבוץ נהג', 'משלוח', 'אישור מסירה'] },
      { name: 'גבייה', steps: ['חשבונית', 'מעקב תשלום', 'תזכורת', 'טיפול בחוב'] },
    ],
    questions: [
      { gap: 'workflow', text: 'איך הזמנה של לקוח עסקי מגיעה אליכם, ומה קורה איתה עד שהיא יוצאת למשלוח?' },
      { gap: 'people', text: 'מי מקליד את ההזמנות, ומי משבץ את הנהגים?' },
      { gap: 'systems', text: 'באיזו מערכת נשמרות ההזמנות, ואיך הן מגיעות אליה?' },
      { gap: 'exceptions', text: 'מה קורה כשהזמנה מגיעה עם טעות או פריט חסר במלאי?' },
      { gap: 'volume', text: 'כמה הזמנות מגיעות בחודש בערך?' },
      { gap: 'time', text: 'כמה דקות לוקח להקליד הזמנה אחת?' },
    ],
    templates: [
      {
        id: 'log-order-entry',
        name: 'הקלדת הזמנות אוטומטית ממייל ווואטסאפ',
        problem: 'הזמנות מגיעות בפורמטים שונים ומוקלדות ידנית, עם טעויות.',
        triggers: ['מקלידים', 'הקלדה', 'הזמנות', 'מייל', 'וואטסאפ', 'ווטסאפ', 'טעויות', 'פקס'],
        capabilityIds: ['intake', 'documents', 'tools'],
        today: 'פקידה מקלידה כל הזמנה למערכת מתוך מייל, וואטסאפ או צילום.',
        after: 'הסוכן מחלץ את פרטי ההזמנה ומכין רשומה לאישור; הפקידה בודקת חריגים.',
        humanRole: 'בדיקה ואישור של חריגים.',
        agentRole: 'חילוץ פרטים והכנת רשומה.',
        needs: ['דוגמאות הזמנות', 'גישה למערכת ההזמנות', 'בדיקה טכנית של רפי'],
        kpi: 'דקות הקלדה להזמנה ושיעור טעויות',
        scores: { value: 4, feasibility: 4, impact: 4, data: 4, speed: 3 },
        risks: { sensitiveData: 'low', professionalJudgment: 'low', irreversibleAction: 'medium', dataCorrectness: 'high' },
        complexity: 'medium',
        pitch: 'אפשרות שעולה לי: הסוכן מכין את ההזמנה מתוך ההודעה, והפקידה רק מאשרת. רוצה שנבדוק כמה זמן זה באמת יכול לפנות?',
        nonMonetary: ['פחות טעויות במשלוחים'],
      },
      {
        id: 'log-delivery-updates',
        name: 'עדכוני משלוח יזומים ללקוחות',
        problem: 'לקוחות מתקשרים לשאול מתי יגיע המשלוח.',
        triggers: ['מתי מגיע', 'מתקשרים', 'נהג', 'משלוח', 'סטטוס', 'עיכוב'],
        capabilityIds: ['outreach', 'tools', 'knowledge'],
        today: 'הסדרן עונה לטלפונים ובודק מול הנהגים.',
        after: 'הסוכן שולח עדכון מועד הגעה ומתריע על עיכובים.',
        humanRole: 'הסדרן מטפל בעיכובים ובחריגים.',
        agentRole: 'שליחת עדכונים ומענה לשאלות סטטוס.',
        needs: ['מקור נתוני מסלולים', 'אנשי קשר של לקוחות'],
        kpi: 'מספר שיחות סטטוס ביום',
        scores: { value: 3, feasibility: 3, impact: 3, data: 2, speed: 3 },
        risks: lowRisk,
        complexity: 'medium',
        pitch: 'כיוון נוסף: עדכון יזום ללקוח מתי המשלוח מגיע, כדי שפחות יתקשרו. מה דעתך?',
        nonMonetary: ['לקוחות רגועים יותר', 'סדרן פנוי לחריגים'],
      },
      {
        id: 'log-collections',
        name: 'מעקב גבייה ותזכורות תשלום',
        problem: 'חשבוניות פתוחות לא מקבלות מעקב קבוע ותזרים נפגע.',
        triggers: ['גבייה', 'תשלום', 'חוב', 'חשבונית', 'שוטף', 'תזרים'],
        capabilityIds: ['followup', 'drafting', 'tools'],
        today: 'הנהלת החשבונות מתקשרת ללקוחות כשיש זמן.',
        after: 'הסוכן מזכיר בעדינות לפי כללים, ומעביר לאדם חובות חריגים.',
        humanRole: 'החלטות על חובות חריגים ומשא ומתן.',
        agentRole: 'תזכורות לפי כללים וסיכום מצב.',
        needs: ['רשימת חשבוניות פתוחות', 'כללי גבייה', 'בדיקה מול רו״ח — לא ייעוץ חשבונאי'],
        kpi: 'ימי אשראי בפועל',
        scores: { value: 4, feasibility: 4, impact: 3, data: 3, speed: 4 },
        risks: { sensitiveData: 'medium', professionalJudgment: 'medium', irreversibleAction: 'medium', dataCorrectness: 'high' },
        complexity: 'low',
        pitch: 'אולי שווה לבדוק גם מעקב גבייה עדין לפי כללים שתקבעו. זה בכלל כאב אצלכם?',
        nonMonetary: ['תזרים צפוי יותר'],
      },
    ],
    sample: {
      business: 'חברת הפצה למסעדות',
      siteText: 'הפצת מוצרי מזון למסעדות ובתי קפה באזור המרכז, משלוחים יומיים.',
      processLine: 'מסעדות שולחות הזמנות בוואטסאפ ובמייל, והפקידה מקלידה אותן למערכת ומעבירה למחסן.',
      peopleLine: 'יש שתי פקידות, סדרן אחד ושמונה נהגים.',
      painLine: 'הרבה טעויות בהקלדה ואז פריטים חסרים אצל הלקוח.',
      numbersLine: 'יש בערך 1500 הזמנות בחודש, וכל אחת לוקחת להקליד בערך 3 דקות.',
    },
  },
];

export const industryById = (id: IndustryId) => INDUSTRIES.find((i) => i.id === id)!;

export const allTemplates = () => INDUSTRIES.flatMap((i) => i.templates);
export const templateById = (id: string) => allTemplates().find((t) => t.id === id);
