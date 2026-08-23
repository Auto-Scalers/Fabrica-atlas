'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../components/auth/supabase';

/* ----------------------------------------------------------------------
   FABRICA LOGO
---------------------------------------------------------------------- */
const FabricaLogo = ({ className = "w-11 h-11", showText = true, dark = false }: { className?: string; showText?: boolean; dark?: boolean }) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <img
        src="/fabrica-logo-2d.jpg"
        alt="Fabrica Brand Logo"
        className={`${className} rounded-xl object-cover border border-slate-200 hover:scale-[1.03] transition-transform duration-200`}
      />
      {showText && (
        <span className={`text-lg font-black tracking-tight ${dark ? 'text-white' : 'text-[#1C1C1E]'}`}>
          Fabrica<span className="text-[#CC7A4A]">.</span>
        </span>
      )}
    </div>
  );
};

/* ----------------------------------------------------------------------
   IMAGE SHOWCASE CARD — Crisp, responsive image component with fallback
---------------------------------------------------------------------- */
const ImageCard = ({
  src,
  alt,
  badge,
  aspect = "aspect-[16/10]",
  blur = 0,
  className = "",
}: {
  src: string;
  alt: string;
  badge?: string;
  aspect?: string;
  blur?: number;
  className?: string;
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <div className={`relative group bg-slate-900 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 hover:scale-[1.01] hover:border-slate-700 ${className}`}>
      <img
        src={src}
        alt={alt}
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
        style={blur > 0 ? { filter: `blur(${blur}px)` } : undefined}
        className={`w-full h-full object-cover ${aspect} group-hover:scale-[1.03] transition-transform duration-500`}
      />
      {badge && (
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur-md border border-slate-700/60 px-2.5 py-1 rounded text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider shadow-lg">
          {badge}
        </div>
      )}
      <div className="absolute inset-0 border border-white/10 rounded-2xl pointer-events-none" />
    </div>
  );
};

/* ----------------------------------------------------------------------
   AMBIENT BANNER — Background layer with optional blur
---------------------------------------------------------------------- */
const AmbientBanner = ({ src, alt, blur = 10 }: { src: string; alt: string; blur?: number }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-black" />;
  }
  return (
    <img
      src={src}
      alt={alt}
      onError={() => setFailed(true)}
      referrerPolicy="no-referrer"
      style={{ filter: `blur(${blur}px) brightness(0.4)` }}
      className="absolute inset-0 w-full h-full object-cover scale-105"
    />
  );
};

/* ----------------------------------------------------------------------
   DATA DEFINITIONS
---------------------------------------------------------------------- */
const PERSONAS_MAP = {
  EN: [
    {
      id: 'consultants',
      tab: "Independent Consultants",
      pain: "You spend dozens of hours manually researching markets, parsing client files, and formatting pitch decks or strategy briefs.",
      fix: "Fabrica automates the research ➔ analysis ➔ deliverable pipeline, generating client-ready reports and strategy matrices with verified sources.",
      proof: "Full Audit Trail — Sources (Research/Data) ➔ Deliverables (Strategy/Reviews)",
    },
    {
      id: 'agencies',
      tab: 'Small Agencies & Creative Teams',
      pain: "Junior staff spend days doing competitive audits, client proposals, and content drafting instead of high-value client work.",
      fix: "Standardize output quality across all client accounts with repeatable autonomous agent pipelines and custom agency skills.",
      proof: "Agency Multi-Tenant Workspaces & Reusable Workflow Pipelines",
    },
    {
      id: 'solopreneurs',
      tab: 'Solopreneurs & DTC Founders',
      pain: "You wear every hat — market researcher, content creator, ops manager — but lack analyst bandwidth and technical dev skills.",
      fix: "Get a full autonomous research and operations partner controlled entirely from the UI with zero technical setup.",
      proof: "Zero Technical Setup — 100% UI Controlled 4-Stage Pipeline",
    },
    {
      id: 'growth',
      tab: "Startup Growth & Ops Teams",
      pain: "You need data-backed growth playbooks, competitor tracking, and automation flows without waiting on engineering sprint capacity.",
      fix: "Run 24/7 background research and strategy execution in autonomy mode — checking results in structured folder structures.",
      proof: "24/7 Autonomy Mode — Structured Folders per Phase (Drafting, Planning, Execution, Delivery)",
    },
    {
      id: 'researchers',
      tab: "Researchers & Analysts",
      pain: "Manually tracking sources, synthesizing findings, and drafting sourced reports is slow and hard to audit later.",
      fix: "Deep Research gathers and logs verifiable sources into structured storage, while Execution checks drafts against citations before Delivery.",
      proof: "Defensible Audit Trail — Verified Sources & Automatic Fact-Check Verification",
    },
  ],
  FR: [
    {
      id: 'consultants',
      tab: "Consultants Indépendants",
      pain: "Vous passez des dizaines d'heures à analyser les marchés et à rédiger manuellement des rapports ou propositions clients.",
      fix: "Fabrica automatise le pipeline recherche ➔ analyse ➔ livrable, générant des rapports et matrices stratégiques prêts pour vos clients.",
      proof: "Audit Complet — Sources (Recherche/Données) ➔ Livrables (Stratégie/Revues)",
    },
    {
      id: 'agencies',
      tab: "Petites Agences & Équipes Créatives",
      pain: "Vos collaborateurs juniors passent des jours sur des audits concurrentiels et propositions au lieu de missions à forte valeur.",
      fix: "Standardisez la qualité de vos livrables sur tous vos comptes grâce à des pipelines d'agents autonomes et compétences sur mesure.",
      proof: "Espaces de Travail Multi-Clients & Pipelines de Flux Réutilisables",
    },
    {
      id: 'solopreneurs',
      tab: "Solopreneurs & Fondateurs E-Commerce",
      pain: "Vous gérez tout seul — étude de marché, création de contenu, opérations — sans avoir d'analyste ni de compétences techniques.",
      fix: "Bénéficiez d'un partenaire autonome complet géré entièrement depuis l'interface utilisateur, sans aucune configuration technique.",
      proof: "Zéro Configuration Technique — Pipeline en 4 Étapes 100% UI",
    },
    {
      id: 'growth',
      tab: "Équipes Growth & Ops Startups",
      pain: "Vous avez besoin de plans de croissance étayés et d'automatisations sans dépendre du calendrier des développeurs.",
      fix: "Exécutez des recherches et stratégies en arrière-plan 24/7 en mode autonomie et consultez les résultats dans des dossiers structurés.",
      proof: "Mode Autonomie 24/7 — Dossiers Structurés par Phase (Brouillon, Plan, Exécution, Livraison)",
    },
    {
      id: 'researchers',
      tab: "Chercheurs & Analystes",
      pain: "Le suivi manuel des sources, la synthèse des données et la rédaction de rapports documentés sont lents et difficiles à auditer.",
      fix: "La Recherche Approfondie rassemble et consigne les sources vérifiables, et l'Exécution vérifie les brouillons avant la Livraison.",
      proof: "Piste d'Audit Défendable — Sources Vérifiées & Vérification Factuelle Automatique",
    },
  ],
  AR: [
    {
      id: 'consultants',
      tab: 'المستشارون المستقلون',
      pain: 'تقضي عشرات الساعات في إجراء البحوث اليدوية وتحليل ملفات العملاء وتنسيق العروض التقديمية.',
      fix: 'فابريكا تؤتمت خط إنتاج البحث ← التحليل ← المخرجات، لتوليد تقارير واستراتيجيات جاهزة للعملاء مع توثيق كامل.',
      proof: 'مسار تدقيق شامل — المصادر (البحث/البيانات) ← المخرجات (الاستراتيجية/المراجعات)',
    },
    {
      id: 'agencies',
      tab: 'الوكالات الصغيرة والفرق الإبداعية',
      pain: 'يقضي الموظفون أيامًا في إعداد التدقيق التنافسي والعروض المقترحة بدلاً من إنجاز المهام عالية القيمة.',
      fix: 'توحيد جودة المخرجات عبر جميع حسابات العملاء باستخدام مسارات الوكلاء المستقلة والمهارات المخصصة.',
      proof: 'مساحات عمل متعددة للعملاء ومسارات عمل قابلة لإعادة الاستخدام',
    },
    {
      id: 'solopreneurs',
      tab: 'الرواد المستقلون ومؤسسو المتاجر',
      pain: 'تتولى كل المهام بمفردك — دراسة السوق، المحتوى، والعمليات — دون فريق تحليلي أو خبرة برمجية.',
      fix: 'احصل على شريك مستقل كامل للبحوث والعمليات يُدار بالكامل من الواجهة بدون أية تعقيدات تقنية.',
      proof: 'بدون إعدادات تقنية — مسار تشغيلي من 4 مراحل عبر الواجهة 100%',
    },
    {
      id: 'growth',
      tab: 'فرق النمو والعمليات في الشركات الناشئة',
      pain: 'تحتاج إلى خطط نمو مبنية على البيانات ومتابعة المنافسين دون الانتظار في قائمة سبرينت الفرق الهندسية.',
      fix: 'تشغيل أبحاث واستراتيجيات متواصلة على مدار الساعة في وضع الاستقلالية مع استعراض النتائج في مجلدات منظمة.',
      proof: 'وضع الاستقلالية 24/7 — مجلدات منظمة حسب كل مرحلة (المسودة، التخطيط، التنفيذ، التسليم)',
    },
    {
      id: 'researchers',
      tab: 'الباحثون والمحللون',
      pain: 'تتبع المصادر يدويًا وتلخيص النتائج وكتابة التقارير الموثقة عملية بطيئة وصعبة التدقيق لاحقًا.',
      fix: 'يجمع نظام البحث المعمق المصادر القابلة للتحقق ويوثقها في التخزين، بينما يتم تدقيق المسودات قبل التسليم.',
      proof: 'مسار تدقيق موثوق — مصادر موثقة والتحقق التلقائي من الحقائق',
    },
  ]
};

const PAIN_PROMISE_MAP = {
  EN: [
    { pain: 'Generic AI chats forget client context the moment you start a new conversation.', fix: 'Persistent Business Memory: Local multi-tenant storage keeps every project, document, and research log safe with zero context drift.' },
    { pain: 'Single AI text guesses force you to manually review and re-prompt every answer.', fix: 'Structured QA Gates: 3 distinct strategic paths with trade-offs presented before execution moves forward.' },
    { pain: 'Spending hours writing complex prompts and formatting outputs into client files.', fix: 'Business-First Pipelines: Automatic 4-stage pipeline (Drafting ➔ Planning ➔ Execution ➔ Delivery) producing client-ready deliverables.' },
    { pain: 'Complex technical integrations and API setups required to connect AI to real business tasks.', fix: 'Zero Technical Setup: 100% UI-controlled workspace with swappable model brain (Gemini, Claude, OpenRouter) and pre-built integrations.' },
    { pain: 'AI tools stop working when you close the tab or leave your laptop.', fix: '24/7 Autonomy Mode: Runs background research rounds, scheduled missions, and pipeline checks continuously on your schedule.' },
    { pain: 'No audit trail or folder organization for research sources vs final client files.', fix: 'Structured Storage Layer: Dedicated folders per phase (Sources for scoping/research/synthesis & Deliverables for execution/reviews).' },
  ],
  FR: [
    { pain: 'Les chats IA génériques oublient le contexte client dès que vous commencez une nouvelle conversation.', fix: 'Mémoire Métier Persistante : le stockage multi-tenant local conserve chaque projet, document et recherche sans aucune perte.' },
    { pain: 'Une simple prédiction IA vous oblige à vérifier et réécrire manuellement chaque réponse.', fix: 'Portes QA Structurées : 3 voies stratégiques distinctes avec arbitrages présentées avant toute exécution.' },
    { pain: 'Passer des heures à rédiger des prompts complexes et à mettre en forme les livrables clients.', fix: 'Pipelines Métier : pipeline automatique en 4 étapes (Brouillon ➔ Planification ➔ Exécution ➔ Livraison) produisant des livrables prêts.' },
    { pain: 'Incitations et intégrations techniques complexes requises pour lier l\'IA aux tâches d\'entreprise.', fix: 'Zéro Configuration Technique : espace 100% contrôlé par l\'UI avec choix de modèles (Gemini, Claude, OpenRouter).' },
    { pain: 'Les outils IA s\'arrêtent dès que vous fermez l\'onglet ou votre ordinateur.', fix: 'Mode Autonomie 24/7 : exécute des rondes de recherche, missions planifiées et vérifications en arrière-plan.' },
    { pain: 'Aucune piste d\'audit ni organisation par dossiers pour distinguer les sources des livrables.', fix: 'Couche de Stockage Structurée : dossiers dédiés par phase (Sources pour recherche & Livrables pour exécution/revues).' },
  ],
  AR: [
    { pain: 'تنسى محادثات الذكاء الاصطناعي العامة سياق العملاء بمجرد بدء محادثة جديدة.', fix: 'ذاكرة أعمال مستمرة: تحفظ قاعدة البيانات كل مشروع ومستند وسجل بحث بدون أي فقدان للسياق.' },
    { pain: 'التخمين الفردي للذكاء الاصطناعي يجبرك على المراجعة اليدوية وإعادة الكتابة باستمرار.', fix: 'بوابات جودة منظمة: عرض 3 مسارات استراتيجية متميزة مع توضيح المزايا قبل التنفيذ.' },
    { pain: 'قضاء ساعات طويلة في كتابة الأوامر وتنسيق المخرجات في ملفات للعملاء.', fix: 'مسارات عمل مخصصة للأعمال: خط إنتاج تلقائي من 4 مراحل يحول الأفكار إلى مخرجات جاهزة للعملاء.' },
    { pain: 'الحاجة إلى إعدادات تقنية وتكاملات معقدة لربط الذكاء الاصطناعي بالمهام الفعلية.', fix: 'بدون إعدادات تقنية: مساحة عمل تُدار بالكامل عبر الواجهة مع إمكانية التبديل بين النماذج بسهولة.' },
    { pain: 'تتوقف أدوات الذكاء الاصطناعي عن العمل فور إغلاق المتصفح أو المغادرة.', fix: 'وضع الاستقلالية 24/7: تشغيل جولات البحث والمهام المجدولة في الخلفية وفقًا لجدولك.' },
    { pain: 'غياب مسار تدقيق أو تنظيم المجلدات للتمييز بين المصادر والمخرجات النهائية.', fix: 'طبقة تخزين منظمة: مجلدات مخصصة لكل مرحلة (المصادر للبحوث والتخطيط والمخرجات للتنفيذ والمراجعة).' },
  ]
};

const SEVEN_STEPS_MAP = {
  EN: [
    { k: 'Analytics 1', d: 'Parse input, map system boundaries.' },
    { k: 'Research 1', d: 'Verify externally against real API docs.' },
    { k: 'Analytics 2', d: 'Synthesize findings into open choices.' },
    { k: 'QA Gate', d: 'Three distinct options with a "Why". Execution freezes until you choose.', gate: true },
    { k: 'Analytics 3', d: 'Map your choice to concrete code config.' },
    { k: 'Research 2', d: 'Targeted follow-up on your specific route.' },
    { k: 'Analytics 4', d: 'Final blueprint, handed to Planning.' },
  ],
  FR: [
    { k: 'Analyse 1', d: 'Analyser les données, cartographier les limites.' },
    { k: 'Recherche 1', d: 'Vérifier par rapport à la documentation API.' },
    { k: 'Analyse 2', d: 'Synthétiser les résultats en choix ouverts.' },
    { k: 'Porte QA', d: 'Trois options distinctes avec "Pourquoi". Exécution gelée jusqu’à votre choix.', gate: true },
    { k: 'Analyse 3', d: 'Associer votre choix à la configuration du code.' },
    { k: 'Recherche 2', d: 'Suivi ciblé sur votre parcours spécifique.' },
    { k: 'Analyse 4', d: 'Plan final transmis à la Planification.' },
  ],
  AR: [
    { k: 'التحليل 1', d: 'تحليل المدخلات ورسم حدود النظام.' },
    { k: 'البحث 1', d: 'التحقق الخارجي مقارنة بتوثيق API.' },
    { k: 'التحليل 2', d: 'تجميع النتائج في خيارات عملية.' },
    { k: 'بوابة الجودة', d: 'ثلاثة خيارات متميزة مع توضيح السبب. يتوقف التنفيذ لحين اختيارك.', gate: true },
    { k: 'التحليل 3', d: 'ربط اختيارك بتهيئة برمجية محددة.' },
    { k: 'البحث 2', d: 'متابعة مستهدفة بناءً على الخيار المحدد.' },
    { k: 'التحليل 4', d: 'المخطط النهائي وتحويله للترميز.' },
  ]
};

const FAQS_MAP = {
  EN: [
    {
      q: 'Does Fabrica generate conceptual blueprints or build real working systems?',
      a: 'We build real, fully functional systems. We provision relational ERP databases, active n8n automation pipelines, custom product codebases, and live telemetry.',
    },
    {
      q: 'What types of inputs can I provide to the harness?',
      a: 'Anything from high-level textual ideas to messy multi-sheet spreadsheets, raw system schemas, API documentation routes, and pre-existing codebase files. Fabrica digests this complexity and maps out the exact dependencies.',
    },
    {
      q: 'Why does it show me three options instead of just building the best one?',
      a: 'Because "the best one" is a judgment call, and it’s yours to make. Brainstorming Mode always formulates at least three genuinely distinct directions with a "Why" behind each, and execution freezes at that QA gate until you pick.',
    },
    {
      q: 'How does the real-time monitoring and telemetry work?',
      a: 'Every custom output we deploy is equipped with active health checkers. When database queries execute, webhooks trigger, or ad metrics sync, the results are formatted and piped directly to your central partner dashboard so you never operate in the dark.',
    },
    {
      q: 'What happens to my data if I stop paying?',
      a: 'Your raw_data and system_components remain yours, exportable on request. We isolate every tenant’s bucket and database rows precisely so nothing about your account depends on anyone else’s.',
    },
    {
      q: 'Can I customize the system prompts and workflows in my dashboard?',
      a: 'Absolutely. From the unified dashboard, you can edit system prompts, modify operational behaviors, configure environment secrets, and monitor live mission backlogs on the fly.',
    },
  ],
  FR: [
    {
      q: 'Fabrica génère-t-il des plans statiques ou dote-t-il l’entreprise de vrais systèmes ?',
      a: 'Nous construisons de vrais systèmes entièrement fonctionnels : bases ERP relationnelles, pipelines d’automatisation n8n actifs, code de produit sur mesure et télémétrie en temps réel.',
    },
    {
      q: 'Quels types deQuels types de données puis-je fournir au système ?',
      a: 'Tout : des idées textuelles, des tableurs complexes, des schémas bruts, de la documentation API et du code existant. Fabrica traite cette complexité et établit la carte des dépendances.',
    },
    {
      q: 'Pourquoi proposer trois options au lieu de construire la meilleure directement ?',
      a: 'Parce que "la meilleure" est un choix stratégique qui vous appartient. Le mode Brainstorming formule au moins trois voies distinctes expliquées, et l’exécution s’arrête à la porte QA jusqu’à votre décision.',
    },
    {
      q: 'Comment fonctionne la surveillance en temps réel ?',
      a: 'Chaque système déployé inclut des contrôles d’état actifs. Les requêtes de base de données, webhooks et métriques sont transmis directement à votre tableau de bord central.',
    },
    {
      q: 'Que deviennent mes données si j’arrête l’abonnement ?',
      a: 'Vos données brutes et composants système restent votre propriété et sont exportables. Chaque client bénéficie d’un stockage totalement isolé.',
    },
    {
      q: 'Puis-je personnaliser les instructions système et les flux dans mon tableau de bord ?',
      a: 'Absolument. Depuis le tableau de bord unifié, vous pouvez modifier les prompts système, ajuster les comportements et surveiller vos missions en direct.',
    },
  ],
  AR: [
    {
      q: 'هل تقدم Fabrica مخططات نظرية أم تبني أنظمة فعلية؟',
      a: 'نبني أنظمة فعلية وكاملة الوظائف. نقوم بإعداد وتنفيذ قواعد بيانات ERP العلاقية، ومسارات أتمتة n8n، والشفرات البرمجية المخصصة مع قياسات أداء حية.',
    },
    {
      q: 'ما هي أنواع المدخلات التي يمكنني تقديمها؟',
      a: 'أي شيء بدءًا من الأفكار النصية إلى الجداول الممتدة والمعقدة، والمخططات البرمجية، وتوثيق API. تقوم Fabrica بتحليل هذه المدخلات وتحديد التبعيات.',
    },
    {
      q: 'لماذا يُعرض علي 3 خيارات بدلاً من بناء الخيار الأفضل مباشرة؟',
      a: 'لأن تحديد "الأفضل" يتطلب قرارًا إستراتيجيًا يعود لك. يعرض وضع العصف الذهني 3 خيارات متميزة مع توضيح السبب ويتوقف التنفيذ لحين اختيارك.',
    },
    {
      q: 'كيف يعمل المراقبة والقياس المباشر؟',
      a: 'كل مخرج مخصص يتم تزويده بمراقب جودة نشط، حيث تُعرض نتائج الاستعلامات وأحداث الويب هوك مباشرة على لوحة التحكم الخاصة بك.',
    },
    {
      q: 'ماذا يحدث لبياناتي عند انتهاء الاشتراك؟',
      a: 'تبقى بياناتك ومكونات نظامك ملكًا لك وقابلة للتصدير بالكامل في أي وقت، مع ضمان العزل التام بين جميع الحسابات.',
    },
    {
      q: 'هل يمكنني تخصيص أوامر النظام وتدفقات العمل؟',
      a: 'بالتأكيد. يمكنك تعديل أوامر النظام، وضبط السلوكيات التشغيلية، ومتابعة قائمة المهام الحية مباشرة من لوحة التحكم.',
    },
  ]
};

const HARD_LAWS_MAP = {
  EN: [
    { t: '1. Autonomous Pipeline', d: 'Structured 4-stage pipeline (Drafting ➔ Planning ➔ Execution ➔ Delivery) producing client deliverables.' },
    { t: '2. Persistent Memory', d: 'Tenant-isolated multi-tenant storage keeps every project, document, and research log safe without context loss.' },
    { t: '3. Audited Deliverables', d: 'Separates gathered research sources from finalized client-ready outputs in auditable folders.' },
    { t: '4. Deep Research Engine', d: 'Queries live web sources and official APIs before drafting or proposing solutions.' },
    { t: '5. 24/7 Background Autonomy', d: 'Missions, competitor scans, and pipeline checks run continuously after closing the site.' },
    { t: '6. Zero Setup Interface', d: '100% UI-controlled workspace with swappable LLM brains (Gemini, Claude, OpenRouter).', }
  ],
  FR: [
    { t: '1. Pipeline Autonome', d: 'Pipeline structuré en 4 étapes (Brouillon ➔ Planification ➔ Exécution ➔ Livraison).', }
  ],
  AR: [
    { t: '1. مسار عمل مستقل', d: 'خط إنتاج من 4 مراحل (المسودة ➔ التخطيط ➔ التنفيذ ➔ التسليم) لمخرجات فائقة.', }
  ]
};

const LANDING_TEXT = {
  EN: {
    nav: { matrix: 'The Matrix', systems: 'Pipelines', workspace: 'Workspace', deepResearch: 'Deep Research', faqs: 'FAQs', openDashboard: 'Open Dashboard' },
    hero: {
      tag: 'Business-First Agentic Operating System',
      h1: 'Run on 24/7 AI Autonomy and Scale. Draft, plan, execute, and verify -- Monitor from a single Dashboard, with zero technical setup.',
      sub: 'AI knows how to reason, output is SLOP.\nStop prompting. Fabrica is your Next AI EXIT.',
      desc: 'if you still run Business & Coding sessions manualy with 80-hour work weeks, files & spreadsheets !',
      launchBtn: 'Launch Your Workspace',
      seeBuildsBtn: 'See How The Pipeline Works'
    },
    sections: {
      personasTitle: 'CHOOSE YOUR OPERATIONAL PATH',
      painTitle: 'Traditional AI Pitfalls vs. Fabrica Business Operating System',
      pipelineTitle: 'The 7-Step Drafting Pipeline',
      pipelineTag: 'Every Deliverable Is Audited Before Approval',
      pipelineSub: 'Three distinct options presented at the QA Gate with explicit trade-offs. No black-box guesses.',
      researchTag: 'Verified, Not Guessed',
      researchTitle: 'Authoritative Market Research & Docs Retrieved Every Session',
      researchSub: 'Deep Research Mode queries live authoritative sources and verified data before a single proposal or deliverable is generated.',
      alwaysOnTag: 'Always-On Operational Continuity',
      alwaysOnTitle: 'Missions That Keep Working After You Close The Site',
      alwaysOnSub: 'Background research rounds, scheduled missions, and pipeline checks run on your schedule.',
      lawsTag: 'Six Laws Governing The Autonomous Engine',
      lawsTitle: 'Agent Kernel & Business Architecture',
      secTag: 'Data Security & Isolated Storage',
      secTitle: 'Built for Security, Isolated by Workspace'
    }
  },
  FR: {
    nav: { matrix: 'La Matrice', systems: 'Pipelines', workspace: 'Espace de Travail', deepResearch: 'Recherche Approfondie', faqs: 'FAQs', openDashboard: 'Ouvrir le Tableau de Bord' },
    hero: {
      tag: 'Système d\'Exploitation Autonome Métier',
      h1: 'Exécutez sur l\'IA 24/7 Autonomie et Échelle. Rédigez, planifiez, exécutez et vérifiez -- Surveillez depuis un seul Tableau de bord, sans aucune configuration technique.',
      sub: 'L\'IA sait raisonner, le résultat est de la SLOP.\nArrêtez les prompts. Fabrica est votre Prochain AI EXIT.',
      desc: 'si vous gérez encore des sessions Business & Coding manuellement avec des semaines de 80h, des fichiers & tableurs !',
      launchBtn: 'Lancer Votre Espace de Travail',
      seeBuildsBtn: 'Découvrir Le Pipeline'
    },
    sections: {
      personasTitle: 'CHOISISSEZ VOTRE PARCOURS OPÉRATIONNEL',
      painTitle: 'Pièges de l’IA Traditionnelle vs. Système Métier Fabrica',
      pipelineTitle: 'Le Pipeline de Rédaction en 7 Étapes',
      pipelineTag: 'Chaque Livrable Est Audité Avant Approbation',
      pipelineSub: 'Trois options distinctes présentées à la porte QA avec arbitrages explicites. Pas de devinettes.',
      researchTag: 'Vérifié, Pas Deviné',
      researchTitle: 'Sources Officielles & Recherches Extraites à Chaque Session',
      researchSub: 'Le mode Recherche Approfondie interroge les sources officielles en direct avant toute création de livrable.',
      alwaysOnTag: 'Continuité Opérationnelle Continue',
      alwaysOnTitle: 'Des Missions Qui Continueront Après la Fermeture du Site',
      alwaysOnSub: 'Les rondes de recherche et les vérifications de pipeline s’exécutent en arrière-plan selon votre planning.',
      lawsTag: 'Six Lois Du Moteur Autonome',
      lawsTitle: 'Noyau d’Agent & Architecture Métier',
      secTag: 'Sécurité des Données & Isolation',
      secTitle: 'Conçu pour la Sécurité, Isolé par Espace de Travail'
    }
  },
  AR: {
    nav: { matrix: 'مصفوفة العمل', systems: 'مسارات العمل', workspace: 'مساحة العمل', deepResearch: 'البحث العميق', faqs: 'الأسئلة الشائعة', openDashboard: 'فتح لوحة التحكم' },
    hero: {
      tag: 'نظام تشغيل مستقل مخصص للأعمال',
      h1: 'انطلق مع الذكاء الاصطناعي 24/7 استقلالية وتوسع. صمّم، خطّط، نفّذ، ودقّق -- راقب من لوحة تحكم واحدة، وبدون أي تعقيدات تقنية.',
      sub: 'الذكاء الاصطناعي يعرف كيف يفكر، والمخرجات العادية سطحية.\nتوقف عن التوجيه. Fabrica هو خروجك القادم بالذكاء الاصطناعي AI EXIT.',
      desc: 'إذا كنت ما زلت تدير جلسات الأعمال والبرمجة يدويًا بأسابيع عمل 80 ساعة، مع الملفات وجداول البيانات !',
      launchBtn: 'بدء استخدام مساحة العمل',
      seeBuildsBtn: 'استكشف كيف يعمل خط الإنتاج'
    },
    sections: {
      personasTitle: 'اختر مسار عملك التشغيلي',
      painTitle: 'عيوب الذكاء الاصطناعي التقليدي مقابل نظام تشغيل Fabrica للأعمال',
      pipelineTitle: 'مسار التخطيط المكون من 7 خطوات',
      pipelineTag: 'تدقيق كل مخرج قبل الاعتماد',
      pipelineSub: 'عرض ثلاثة خيارات متميزة عند بوابة الجودة مع توضيح الإيجابيات والسلبيات بدون تخمين.',
      researchTag: 'موثق بالدليل وليس بالتخمين',
      researchTitle: 'استرجاع بحوث السوق والوثائق الموثوقة في كل جلسة',
      researchSub: 'يقوم وضع البحث العميق باسترجاع التوثيق المباشر والتحقق منه قبل توليد أي مقترح أو مخرج.',
      alwaysOnTag: 'استمرارية تشغيلية متواصلة',
      alwaysOnTitle: 'مهام تواصل العمل حتى بعد إغلاق الموقع',
      alwaysOnSub: 'جولات البحث والمراجعات المجدولة تنفذ في الخلفية وفقًا لجدولك الزمني.',
      lawsTag: 'ستة قوانين تحكم المحرك المستقل',
      lawsTitle: 'نواة العميل والبنية التشغيلية',
      secTag: 'أمان البيانات والعزل المستقل',
      secTitle: 'مصمم للأمان ومضمون بعزل مساحة العمل'
    }
  }
};

const CHAT_CHIPS: { q: string; a: string }[] = [
  { q: 'What is Fabrica, really?', a: 'A Business-First Agentic Operating System. Your AI partner runs structured 4-stage missions (Drafting ➔ Planning ➔ Execution ➔ Delivery) with custom skills and an autonomy mode that keeps working after you close the site — with zero technical setup.' },
  { q: 'How does the 4-stage Mission pipeline work?', a: 'Every mission moves through Drafting, Planning, Execution, and Delivery. In Planning, it runs Deep Research & Pattern Extraction; in Execution, it drafts your client-ready deliverable and verifies claims against gathered sources.' },
  { q: 'How does Autonomy Mode work?', a: 'When you close your browser tab, Fabrica continues running your scheduled research rounds, competitor scans, and pipeline checks in the background, saving all sources and drafts into your auditable storage layer.' },
  { q: 'Can I manage research sources and client deliverables?', a: 'Yes. Fabrica\'s structured storage layer separates sources (gathered during scoping/research) from deliverables (generated in execution/reviews), allowing you to audit, delete, add, or export files anytime.' },
];

/* ----------------------------------------------------------------------
   BOOT SEQUENCE — One line sequence
---------------------------------------------------------------------- */
const BOOT_LINES = [
  '[*] Booting kernel...',
  '[OK] Context loaded',
  '[+] Workspace ready',
];

const PILLARS_MAP = {
  EN: {
    tag: 'The Unified Execution Pipeline',
    title: 'From Unstructured Briefs to Audited Deliverables',
    col1Tag: '1. BRIEFS & DATA', col1H3: 'Drop in Any Brief or File', col1Desc: 'Client discovery notes, CSVs, and spreadsheets — Fabrica digests your context without technical setup.',
    col1Items: ['💡 Client briefs & discovery notes', '📊 Raw CSVs, spreadsheets & docs', '🔗 Pre-existing reports & guidelines'],
    col2Tag: '2. 4-STAGE MISSIONS', col2H3: 'Run Structured Pipelines', col2Desc: 'Four structured phases (Drafting ➔ Planning ➔ Execution ➔ Delivery) turn research into deliverables.',
    col2Items: ['🔬 Verified deep research & citations', '📈 Strategic synthesis & trade-off matrices', '✍️ Client-ready proposals & copy', '🕒 24/7 Autonomy Mode background work'],
    col3Tag: '3. DELIVERABLES', col3H3: 'Audited Client-Ready Output', col3Desc: 'Polished deliverables with verified source trails, ready for your clients.',
    col3Items: ['📑 Client-ready proposals & strategy decks', '📊 Verified competitive audits & pricing models', '🗂️ Exportable research sources & audit trails']
  },
  FR: {
    tag: 'Le Pipeline d’Exécution Unifié',
    title: 'Des Briefs Bruts Aux Livrables Audités',
    col1Tag: '1. BRIEFS & DONNÉES', col1H3: 'Déposez Briefs ou Fichiers', col1Desc: 'Notes de découverte, CSVs et tableurs — Fabrica assimile votre contexte sans configuration technique.',
    col1Items: ['💡 Briefs clients & notes de découverte', '📊 CSVs bruts, tableurs & documents', '🔗 Rapports existants & charte de marque'],
    col2Tag: '2. MISSIONS EN 4 ÉTAPES', col2H3: 'Pipelines Structurés', col2Desc: 'Quatre phases (Brouillon ➔ Planification ➔ Exécution ➔ Livraison) transforment la recherche en livrables.',
    col2Items: ['🔬 Recherche approfondie & citations vérifiées', '📈 Matrices stratégiques & arbitrages', '✍️ Propositions & livrables prêts pour clients', '🕒 Mode Autonomie 24/7 en arrière-plan'],
    col3Tag: '3. LIVRABLES', col3H3: 'Résultats Audités Prêts', col3Desc: 'Livrables soignés accompagnés de sources vérifiées.',
    col3Items: ['📑 Propositions clients & dossiers stratégiques', '📊 Audits concurrentiels & grilles tarifaires', '🗂️ Sources exportables & piste d’audit']
  },
  AR: {
    tag: 'خط إنتاج التنفيذ الموحد',
    title: 'من موجزات الأفكار إلى المخرجات المدققة',
    col1Tag: '1. المدخلات والوثائق', col1H3: 'أدرج أي وثيقة أو ملف', col1Desc: 'ملاحظات العملاء، ملفات CSV، والجداول — فابريكا تستوعب سياق عملك بدون أي إعدادات تقنية.',
    col1Items: ['💡 موجزات العملاء وملاحظات الاستكشاف', '📊 الجداول والملفات الخام', '🔗 التقارير السابقة وأدلة العلامة التجارية'],
    col2Tag: '2. مهام من 4 مراحل', col2H3: 'مسارات عمل منظمة', col2Desc: 'أربع مراحل تشغيلية (المسودة ← التخطيط ← التنفيذ ← التسليم) تحول البحث إلى مخرجات.',
    col2Items: ['🔬 بحث عميق ومصادر موثقة', '📈 تحليل استراتيجي ومقارنات البدائل', '✍️ عروض ومقترحات جاهزة للعملاء', '🕒 وضع الاستقلالية 24/7 في الخلفية'],
    col3Tag: '3. المخرجات النهائية', col3H3: 'مخرجات مدققة وجاهزة', col3Desc: 'تقارير واستراتيجيات جاهزة للعملاء مع توثيق كامل للمصادر.',
    col3Items: ['📑 عروض تقديمية وخطط استراتيجية جاهزة', '📊 دراسات تنافسية ونماذج تسعير موثقة', '🗂️ مصادر قابلة للتصدير وسجل تدقيق']
  }
};

const SYSTEMS_MAP = {
  EN: {
    tag: 'No Technical Setup. A Standing Research & Content Partner.',
    title: 'Repeatable Business-First Agentic Pipelines',
    c1H3: 'Client Discovery & Strategy Briefs', c1Desc: 'Turn messy client calls and discovery notes into structured 90-day roadmaps, competitive teardowns, and strategic proposals without manual formatting.', c1Foot: 'Pipeline: Drafting ➔ Planning ➔ Execution ➔ Delivery',
    c2H3: '24/7 Competitor & Market Monitoring', c2Desc: 'Let Autonomy Mode scan competitor pricing, reviews, and market trends weekly or monthly per client — saving auditable sources right in your workspace.', c2Foot: 'Autonomy Mode: Continuous background execution',
    c3H3: 'Verified Deliverable Drafting', c3Desc: 'Execution phase verifies every claim against gathered research sources before your final review in Delivery, keeping a defensible audit trail.', c3Foot: 'Full auditability: Sources vs. Deliverables'
  },
  FR: {
    tag: 'Zéro Config Technique. Un Partenaire Recherche & Stratégie.',
    title: 'Pipelines Autonomes Répétables et Structurés',
    c1H3: 'Briefs de Découverte & Stratégie Client', c1Desc: 'Transformez vos notes de réunion en feuilles de route sur 90 jours et propositions stratégiques sans mise en forme manuelle.', c1Foot: 'Pipeline : Brouillon ➔ Planification ➔ Exécution ➔ Livraison',
    c2H3: 'Veille Concurrentielle & Marché 24/7', c2Desc: 'Le Mode Autonomie analyse les tarifs concurrents et avis chaque semaine ou mois pour vos clients, en consignant les sources.', c2Foot: 'Mode Autonomie : Exécution continue en arrière-plan',
    c3H3: 'Rédaction de Livrables Vérifiés', c3Desc: 'La phase d’Exécution vérifie chaque affirmation avec les sources avant votre revue finale lors de la Livraison.', c3Foot: 'Auditabilité complète : Sources vs Livrables'
  },
  AR: {
    tag: 'بدون إعدادات تقنية. شريك دائم للبحوث والاستراتيجية.',
    title: 'مسارات عمل مستقلة ومتكررة للأعمال',
    c1H3: 'تحليل موجزات العملاء والاستراتيجية', c1Desc: 'تحويل ملاحظات الاجتماعات وموجزات العملاء إلى خطط عمل لمدة 90 يومًا وعروض استراتيجية جاهزة بدون تنسيق يدوي.', c1Foot: 'المسار: المسودة ← التخطيط ← التنفيذ ← التسليم',
    c2H3: 'مراقبة المنافسين والسوق 24/7', c2Desc: 'يقوم وضع الاستقلالية بمراقبة أسعار المنافسين واتجاهات السوق أسبوعيًا أو شهريًا، مع حفظ المصادر في مساحة عملك.', c2Foot: 'وضع الاستقلالية: تشغيل مستمر في الخلفية',
    c3H3: 'صياغة مخرجات مدققة وموثقة', c3Desc: 'تتحقق مرحلة التنفيذ من صحة كل معلومة ومصدر قبل المراجعة النهائية في مرحلة التسليم، مما يوفر مسار تدقيق موثوق.', c3Foot: 'تدقيق كامل: المصادر مقابل المخرجات'
  }
};

const WORKSPACE_MAP = {
  EN: {
    tag: 'One Workspace. Three Panels. Nothing Hidden.',
    title: 'Inside the Business-First Workspace',
    sub: 'This is the actual interactive workspace — structured, auditable, and persistent.',
    panelA: 'Panel A: Mission Control & Skills',
    panelADesc: 'Control built-in + custom skills, toggle 24/7 Autonomy Mode, and inspect real-time agent execution logs — zero coding required.',
    panelB: 'Panel B: The 4-Stage Mission Pipeline',
    panelBDesc: 'Track every mission across Drafting ➔ Planning ➔ Execution ➔ Delivery. Review QA Gates and strategic trade-offs before approving.',
    panelC: 'Panel C: Structured Storage Layer',
    panelCDesc: 'Dedicated folders per phase: Sources (scoping, research, synthesis) on the left, and Deliverables (execution drafts, client reviews) on the right.',
    dataTitle: 'Research & Sources', dataSub: 'Verified citations, client briefs, CSVs & notes',
    sysTitle: 'Client Deliverables', sysSub: 'Proposals, strategy decks, copy & audit trails'
  },
  FR: {
    tag: 'Un Espace. Trois Panneaux. Rien de Caché.',
    title: 'À l’Intérieur de l’Espace de Travail Métier',
    sub: 'Voici votre espace interactif — structuré, auditable et persistant.',
    panelA: 'Panneau A: Contrôle des Missions & Compétences',
    panelADesc: 'Gérez vos compétences, activez le Mode Autonomie 24/7 et consultez les journaux d’exécution en temps réel sans coder.',
    panelB: 'Panneau B: Le Pipeline en 4 Étapes',
    panelBDesc: 'Suivez chaque mission sur Brouillon ➔ Planification ➔ Exécution ➔ Livraison. Validez les arbitrages aux Portes QA.',
    panelC: 'Panneau C: Couche de Stockage Structurée',
    panelCDesc: 'Dossiers dédiés : Sources (recherche, synthèse) à gauche, et Livrables (brouillons, revues clients) à droite.',
    dataTitle: 'Recherches & Sources', dataSub: 'Citations vérifiées, briefs clients, CSVs & notes',
    sysTitle: 'Livrables Clients', sysSub: 'Propositions, dossiers stratégiques & piste d’audit'
  },
  AR: {
    tag: 'مساحة عمل واحدة. ثلاثة لوحات. كل شيء شفاف.',
    title: 'داخل مساحة العمل المخصصة للأعمال',
    sub: 'جولة تفاعلية حقيقية داخل مساحة العمل — منظمة ومستمرة وموثقة.',
    panelA: 'اللوحة أ: التحكم بالمهام والمهارات',
    panelADesc: 'تحكم بالمهارات المدمجة والمخصصة، وقم بتفعيل وضع الاستقلالية 24/7، وراجع سجلات التنفيذ الحية بدون أي تعقيدات برمجية.',
    panelB: 'اللوحة ب: مسار العمل من 4 مراحل',
    panelBDesc: 'تابع كل مهمة عبر المراحل: المسودة ← التخطيط ← التنفيذ ← التسليم. راجع بوابات الجودة ومقارنات البدائل قبل الاعتماد.',
    panelC: 'اللوحة ج: طبقة التخزين المنظمة',
    panelCDesc: 'مجلدات مخصصة لكل مرحلة: المصادر والبحوث على اليسار، والمخرجات والعروض النهائية على اليمين.',
    dataTitle: 'البحوث والمصادر', dataSub: 'التوثيق، موجزات العملاء، ملفات CSV والملاحظات',
    sysTitle: 'مخرجات العملاء', sysSub: 'العروض التقديمية، الخطط الاستراتيجية وسجل التدقيق'
  }
};

const RESEARCH_MAP = {
  EN: {
    tag: 'Verified Sources, Not Guessed',
    title: 'Authoritative Market Research & Sources Retrieved Every Session',
    desc: 'Deep Research Mode never relies solely on pre-trained model guesses. Every competitor pricing tier, market trend, and citation is queried live against authoritative sources and verified before your proposal or deliverable is generated.',
    c1H3: '🔬 Verified Source Citations', c1Desc: 'Every claim and data point links back to an auditable source file stored in your workspace.',
    c2H3: '🛡️ Tenant-Isolated Storage Layer', c2Desc: 'Research logs, client briefs, and review drafts are strictly isolated by client folder.'
  },
  FR: {
    tag: 'Sources Vérifiées, Pas Devinées',
    title: 'Recherche Marché & Sources Officielles à Chaque Session',
    desc: 'Le mode Recherche Approfondie ne se fie pas aux devinettes. Chaque tarif concurrent, tendance et citation est vérifié auprès de sources officielles.',
    c1H3: '🔬 Citations de Sources Vérifiées', c1Desc: 'Chaque affirmation est reliée à un fichier source auditable stocké dans votre espace.',
    c2H3: '🛡️ Stockage Isolé par Client', c2Desc: 'Les journaux de recherche et brouillons sont strictement isolés par dossier client.'
  },
  AR: {
    tag: 'مصادر موثقة بالدليل وليس بالتخمين',
    title: 'استرجاع بحوث السوق والمصادر الموثوقة في كل جلسة',
    desc: 'لا يعتمد وضع البحث العميق على التخمين، بل يتم التحقق من كل معلومة وسعر وتوجه في السوق عبر مصادر موثوقة ومباشرة قبل صياغة العرض أو المخرج.',
    c1H3: '🔬 توثيق المصادر المعتمدة', c1Desc: 'ترتبط كل معلومة بمصدر موثق ومحفوظ داخل مساحة عملك لسهولة التدقيق.',
    c2H3: '🛡️ طبقة تخزين معزولة وآمنة', c2Desc: 'يتم عزل سجلات البحث وموجزات العملاء والمسودات داخل مجلدات مستقلة لكل عميل.'
  }
};

const ALWAYS_ON_MAP = {
  EN: {
    tag: '24/7 Autonomy Mode',
    title: 'Missions That Keep Working After You Close The Site',
    desc: 'Set recurring competitor scans, market monitoring, and content verification to run in the background on your schedule. Fabrica works quietly overnight so you wake up to completed, auditable client deliverables in your morning inbox.',
    t1: '⚡ Scheduled Background Research', t2: '🟢 Continuous Pipeline Execution'
  },
  FR: {
    tag: 'Mode Autonomie 24/7',
    title: 'Des Missions Qui Continuent Après la Fermeture du Site',
    desc: 'Planifiez des analyses de concurrence et surveillances de marché en arrière-plan. Fabrica travaille toute la nuit pour vous livrer des rapports complets au matin.',
    t1: '⚡ Recherche de Fond Planifiée', t2: '🟢 Exécution Continue du Pipeline'
  },
  AR: {
    tag: 'وضع الاستقلالية 24/7',
    title: 'مهام تواصل العمل حتى بعد إغلاق الموقع',
    desc: 'قم بجدولة تحليلات المنافسين ومراقبة السوق للعمل في الخلفية وفق جدولك الزمني. تعمل فابريكا ليلاً لتستيقظ على تقارير ومخرجات جاهزة وموثقة للعملاء.',
    t1: '⚡ بحوث خلفية مجدولة آليًا', t2: '🟢 تنفيذ متواصل لمسارات العمل'
  }
};

const MATURITY_MAP = {
  EN: [
    { t: 'PROTOTYPE', d: 'Experimental logic / raw draft' },
    { t: 'ALPHA', d: 'Functional sandbox execution' },
    { t: 'BETA', d: 'Passing full QA Gate criteria' },
    { t: 'PRODUCTION', d: 'Proven, scalable system module' }
  ],
  FR: [
    { t: 'PROTOTYPE', d: 'Brouillon brut / logique expérimentale' },
    { t: 'ALPHA', d: 'Exécution fonctionnelle en sandbox' },
    { t: 'BETA', d: 'Validation complète de la Porte QA' },
    { t: 'PRODUCTION', d: 'Module système prouvé et évolutif' }
  ],
  AR: [
    { t: 'نموذج أولي', d: 'مسودة أولية منطقية تجريبية' },
    { t: 'إصدار أسطول', d: 'تنفيذ وظيفي في بيئة اختبار معزولة' },
    { t: 'إصدار تجريبي', d: 'اجتياز كامل لمعايير بوابة الجودة' },
    { t: 'إصدار إنتاجي', d: 'وحدة نظام مجربة وقابلة للتوسع' }
  ]
};

const SECURITY_MAP = {
  EN: [
    { t: 'RLS Tenant Isolation', d: 'Every query is scope-enforced at row level.' },
    { t: 'Sandboxed Node VM', d: 'Execution is isolated with 1000ms CPU limits.' },
    { t: 'Encrypted Persistence', d: 'CMEK encryption for all sensitive context.' },
    { t: 'Automated QA Audit', d: '3-way path trade-off audit on every build.' }
  ],
  FR: [
    { t: 'Isolation Client RLS', d: 'Chaque requête est appliquée au niveau des lignes.' },
    { t: 'Sandbox VM Node.js', d: 'Exécution isolée avec limite CPU de 1000ms.' },
    { t: 'Stockage Chiffré', d: 'Chiffrement CMEK pour tout le contexte sensible.' },
    { t: 'Audit QA Automatisé', d: 'Audit d’arbitrage à 3 voies sur chaque build.' }
  ],
  AR: [
    { t: 'عزل المستأجر RLS', d: 'يتم فرض النطاق على مستوى كل صف في البيانات.' },
    { t: 'بيئة معزولة Node VM', d: 'التنفيذ معزول مع حد معالجة 1000 ميلي ثانية.' },
    { t: 'التخزين المشفر', d: 'تشفير CMEK لجميع النصوص الحساسة.' },
    { t: 'تدقيق جودة آلي', d: 'تدقيق دراسة جدوى بـ 3 مسارات لكل بناء.' }
  ]
};

const CTA_MAP = {
  EN: {
    title: 'Your Business Brain, Always On.',
    sub: 'Deploy your autonomous partner in under 60 seconds. Nothing you build here disappears when you close the tab.',
    btn: 'Launch Your Workspace',
    faqTitle: 'Frequently Answered Inquiries',
    secTag: 'Sandboxed by Default, Not by Request',
    secTitle: 'Enterprise Security & Compliance',
    matTag: 'Know Exactly How Proven It Is',
    matTitle: 'The Maturity Ladder',
    matDesc: 'Every integration, database connector, and custom module carries a public maturity rating. You never deploy a stub to production by mistake.',
    footer: '© 2026 Fabrica. Custom deployed systems from any input. All rights reserved.'
  },
  FR: {
    title: 'Le Cerveau de Votre Entreprise, Toujours Actif.',
    sub: 'Déployez votre partenaire autonome en moins de 60 secondes. Rien de ce que vous construisez ne disparaît.',
    btn: 'Lancer Votre Espace de Travail',
    faqTitle: 'Foire Aux Questions',
    secTag: 'En Sandbox par Défaut',
    secTitle: 'Sécurité & Conformité Entreprise',
    matTag: 'Sachez Exactement Quel Est Son Niveau de Preuve',
    matTitle: 'L’Échelle de Maturité',
    matDesc: 'Chaque intégration, connecteur de base de données et module personnalisé porte une évaluation publique de maturité.',
    footer: '© 2026 Fabrica. Systèmes sur mesure déployés à partir de tout type d’entrée. Tous droits réservés.'
  },
  AR: {
    title: 'عقل أعمالك، يعمل على مدار الساعة.',
    sub: 'قم بتشغيل شريكك المستقل في أقل من 60 ثانية. لا شيء تبنيه هنا يضيع بعد إغلاق المتصفح.',
    btn: 'بدء استخدام مساحة العمل',
    faqTitle: 'الأسئلة الشائعة والإجابات',
    secTag: 'معزول افتراضيًا ومضمون الأمان',
    secTitle: 'الأمان المؤسسي والامتثال',
    matTag: 'اعرف بدقة مستوى نضج واعتمادية كل أداة',
    matTitle: 'سلم نضج الأدوات',
    matDesc: 'يحمل كل تكامل وموصل قاعدة بيانات وحدة مخصصة تقييم نضج عام وواضح لضمان عدم نشر أي كود غير مكتمل.',
    footer: '© 2026 Fabrica. أنظمة مخصصة مبنية من أي مصدر مدخلات. جميع الحقوق محفوظة.'
  }
};

function BootSequence() {
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    const timers = BOOT_LINES.map((_, i) =>
      setTimeout(() => setVisible((v) => Math.max(v, i + 1)), 350 + i * 420)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  return (
    <div className="font-mono text-[11px] flex items-center flex-wrap gap-2 mb-2">
      {BOOT_LINES.slice(0, visible).map((line, i) => (
        <span key={i} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-slate-400 font-normal">➔</span>}
          <span className={line.startsWith('[+]') ? 'text-[#CC7A4A] font-bold' : line.startsWith('[OK]') ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
            {line}
          </span>
        </span>
      ))}
    </div>
  );
}

/* ----------------------------------------------------------------------
   FLOATING CONCIERGE CHATBOT — Enhanced UI & floating window
---------------------------------------------------------------------- */
const CONCIERGE_TRANSLATIONS = {
  EN: {
    btnOpen: "Ask Fabrica AI Partner",
    btnClose: "Close AI Partner",
    subtitle: "24/7 Autonomous Pipeline",
    title: "Fabrica AI Partner",
    status: "● 24/7 AUTONOMOUS PIPELINE · ONLINE",
    previewTag: "Interactive preview — discover our 4-stage autonomous pipeline",
    welcome: "Hi — I’m your Fabrica AI Partner. Ask how our 24/7 autonomous pipeline turns raw business systems into audited client deliverables.",
    quickTitle: "Frequently Asked Questions",
    thinking: "Kernel reasoning...",
    inputPlaceholder: "Ask about our 4-stage autonomous pipeline...",
    sendBtn: "Send",
    clearBtn: "Reset",
    chips: [
      { q: "How does the 4-stage autonomous pipeline work?", a: "Fabrica operates a continuous 4-stage loop: Drafting ➔ Planning ➔ Execution ➔ Delivery. Your AI model reasons through tasks while Fabrica maintains persistent state, audit trails, and client deliverables 24/7." },
      { q: "Can I use Fabrica with zero technical setup?", a: "Yes! Fabrica is engineered for non-technical solopreneurs, independent consultants, small agencies, and growth teams. You control the entire 24/7 pipeline from a single intuitive Dashboard." },
      { q: "What client deliverables can Fabrica generate?", a: "Market research reports, competitive audits, client proposals, strategy matrices, growth playbooks, and automated client deliverables with full verification audit logs." },
      { q: "How are my business systems & data protected?", a: "Tenant-isolated workspace storage with Supabase Authentication ensures your raw business systems and client deliverables are strictly isolated, audited, and exportable anytime." }
    ]
  },
  FR: {
    btnOpen: "Échanger avec le Partenaire IA",
    btnClose: "Fermer le Partenaire IA",
    subtitle: "Pipeline Autonome 24/7",
    title: "Partenaire IA Fabrica",
    status: "● PIPELINE AUTONOME 24/7 · EN LIGNE",
    previewTag: "Aperçu interactif — découvrez notre pipeline en 4 étapes",
    welcome: "Bonjour — Je suis votre Partenaire IA Fabrica. Comment puis-je vous aider à transformer vos systèmes en livrables clients audités aujourd'hui ?",
    quickTitle: "Questions Fréquentes",
    thinking: "Analyse du noyau...",
    inputPlaceholder: "Posez une question sur le pipeline autonome...",
    sendBtn: "Envoyer",
    clearBtn: "Réinitialiser",
    chips: [
      { q: "Comment fonctionne le pipeline autonome en 4 étapes ?", a: "Fabrica exécute une boucle continue en 4 étapes : Brouillon ➔ Planification ➔ Exécution ➔ Livraison. L'IA raisonne tandis que Fabrica maintient l'état et la traçabilité 24/7." },
      { q: "Puis-je l'utiliser sans aucune compétence technique ?", a: "Oui ! Fabrica est conçu pour les solopreneurs, consultants et petites agences non-techniques. Vous contrôlez tout depuis un Tableau de Bord unique." },
      { q: "Quels types de livrables Fabrica peut-il générer ?", a: "Rapports d'étude de marché, audits concurrentiels, propositions clients, matrices de stratégie et playbooks de croissance avec journal d'audit vérifié." },
      { q: "Comment mes données et livrables sont-ils sécurisés ?", a: "Le stockage isolé avec l'authentification Supabase garantit que vos systèmes et livrables clients sont protégés et exportables à tout moment." }
    ]
  },
  AR: {
    btnOpen: "اسأل شريك Fabrica الذكي",
    btnClose: "إغلاق المساعد",
    subtitle: "مسار عمل مستقل على مدار الساعة",
    title: "شريك Fabrica الذكي",
    status: "● مسار عمل مستقل 24/7 · متصل",
    previewTag: "معاينة تفاعلية — اكتشف كيف يعمل مسارنا الرباعي",
    welcome: "مرحبًا — أنا شريكك الذكي في Fabrica. كيف يمكنني مساعدتك اليوم في تحويل أنظمة عملك إلى مخرجات مدققة وجاهزة لعملائك؟",
    quickTitle: "أسئلة شائعة",
    thinking: "النواة تحلل...",
    inputPlaceholder: "اسأل عن مسار العمل المستقل في 4 مراحل...",
    sendBtn: "إرسال",
    clearBtn: "إعادة ضبط",
    chips: [
      { q: "كيف يعمل مسار العمل المستقل من 4 مراحل؟", a: "تعمل Fabrica عبر حلقة متصلة من 4 مراحل: المسودة ← التخطيط ← التنفيذ ← التسليم. يحلل الذكاء الاصطناعي المهام بينما تحافظ Fabrica على استمرارية العمل والتدقيق على مدار الساعة." },
      { q: "هل يمكنني استخدامه بدون أي خبرة تقنية؟", a: "نعم! تم تصميم Fabrica خصيصًا للرواد المستقلين والمستشارين والوكالات بدون أي تعقيدات تقنية، وتدير كل شيء من لوحة تحكم واحدة." },
      { q: "ما هي المخرجات التي يمكن لـ Fabrica إنشاؤها؟", a: "تقارير أبحاث السوق، دراسات المنافسين، عروض العملاء، مصفوفات الاستراتيجية، وخطط النمو مع سجلات تدقيق وتحقق كاملة." },
      { q: "كيف تتم حماية بياناتي ومخرجات عملائي؟", a: "يضمن التخزين المعزول المصحوب بمصادقة Supabase أمان وسرية أنظمتك ومخرجاتك بالكامل، مع إمكانية تصديرها في أي وقت." }
    ]
  }
};

function ConciergeChatbot({ agentLang = 'EN' }: { agentLang?: 'EN' | 'FR' | 'AR' }) {
  const [open, setOpen] = useState(false);
  const [autoOpened, setAutoOpened] = useState(false);
  const [currentLang, setCurrentLang] = useState<'EN' | 'FR' | 'AR'>(agentLang);
  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([]);
  const [inputText, setInputText] = useState('');
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCurrentLang(agentLang);
  }, [agentLang]);

  useEffect(() => {
    const handleSyncAgentLang = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setCurrentLang(customEvt.detail);
      } else {
        const saved = (localStorage.getItem('fabrica_agent_lang') as 'EN' | 'FR' | 'AR') || 'EN';
        setCurrentLang(saved);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fabrica_agent_lang' && e.newValue) {
        setCurrentLang(e.newValue as 'EN' | 'FR' | 'AR');
      }
    };
    window.addEventListener('fabrica:agent-lang-change', handleSyncAgentLang);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('fabrica:agent-lang-change', handleSyncAgentLang);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const t = CONCIERGE_TRANSLATIONS[currentLang] || CONCIERGE_TRANSLATIONS.EN;

  useEffect(() => {
    setMessages([
      { role: 'bot', text: t.welcome }
    ]);
  }, [currentLang]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!autoOpened) {
        setOpen(true);
        setAutoOpened(true);
      }
    }, 9000);
    return () => clearTimeout(timer);
  }, [autoOpened]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query) return;

    setMessages((m) => [...m, { role: 'user', text: query }]);
    if (!textToSend) setInputText('');
    setTyping(true);

    setTimeout(() => {
      setTyping(false);
      let reply = "";
      const lower = query.toLowerCase();

      // 1. Check exact or close match with chip questions first
      const chipMatch = t.chips.find((c) => c.q.toLowerCase() === lower || lower.includes(c.q.toLowerCase().slice(0, 15)));
      if (chipMatch) {
        reply = chipMatch.a;
      } else if (lower.includes('pipeline') || lower.includes('stage') || lower.includes('loop') || lower.includes('work') || lower.includes('how') || lower.includes('مراحل') || lower.includes('كيف') || lower.includes('4-stage')) {
        reply = currentLang === 'AR'
          ? "تعمل Fabrica عبر حلقة متصلة من 4 مراحل: المسودة ← التخطيط ← التنفيذ ← التسليم. يحلل الذكاء الاصطناعي المهام بينما تحافظ Fabrica على استمرارية العمل والتدقيق على مدار الساعة."
          : currentLang === 'FR'
          ? "Fabrica exécute une boucle continue en 4 étapes : Brouillon ➔ Planification ➔ Exécution ➔ Livraison. L'IA raisonne tandis que Fabrica maintient l'état et la traçabilité 24/7."
          : "Fabrica operates a continuous 4-stage loop: Drafting ➔ Planning ➔ Execution ➔ Delivery. Your AI model reasons through tasks while Fabrica maintains persistent state, audit trails, and client deliverables 24/7.";
      } else if (lower.includes('deliver') || lower.includes('output') || lower.includes('client') || lower.includes('audit') || lower.includes('report') || lower.includes('مخرجات') || lower.includes('عميل')) {
        reply = currentLang === 'AR'
          ? "تنتج فابريكا مخرجات مدققة وجاهزة لعملائك مثل تقارير أبحاث السوق، دراسات المنافسين، عروض العملاء، مصفوفات الاستراتيجية، وخطط النمو مع سجلات تدقيق وتحقق كاملة."
          : currentLang === 'FR'
          ? "Fabrica génère des livrables clients audités et vérifiés : rapports d'étude de marché, audits concurrentiels, propositions clients, matrices de stratégie et playbooks de croissance."
          : "Fabrica generates audited client deliverables including market research reports, competitive audits, client proposals, strategy matrices, and growth playbooks with full verification logs.";
      } else if (lower.includes('price') || lower.includes('cost') || lower.includes('plan') || lower.includes('subscr') || lower.includes('free') || lower.includes('سعر') || lower.includes('خطة') || lower.includes('forfait')) {
        reply = currentLang === 'AR'
          ? "تقدم فابريكا خطة مجانية للبدء، بالإضافة إلى اشتراكات للمحترفين والمؤسسات بمرونة كاملة ودعم تقني على مدار الساعة."
          : currentLang === 'FR'
          ? "Fabrica propose un forfait gratuit pour commencer, ainsi que des abonnements flexibles pour utilisateurs avancés et entreprises."
          : "Fabrica offers a Free tier to start, along with flexible Power User and Enterprise plans with 24/7 priority support.";
      } else if (lower.includes('setup') || lower.includes('tech') || lower.includes('code') || lower.includes('solopreneur') || lower.includes('agency') || lower.includes('تقني')) {
        reply = currentLang === 'AR'
          ? "تم تصميم Fabrica خصيصًا للرواد المستقلين والمستشارين والوكالات بدون أي تعقيدات تقنية، وتدير كل شيء من لوحة تحكم واحدة."
          : currentLang === 'FR'
          ? "Fabrica est conçu pour les solopreneurs, consultants et petites agences non-techniques. Vous contrôlez tout depuis un Tableau de Bord unique sans code ni configuration."
          : "Fabrica is engineered for non-technical solopreneurs, consultants, and agencies. You control the entire 24/7 autonomous pipeline from a single Dashboard with zero technical setup.";
      } else {
        reply = currentLang === 'AR'
          ? "شكراً لسؤالك! يمكنك البدء فوراً بالنقر على 'دخول المنصة' أو اختيار أحد الأسئلة المقترحة أدناه للتعرف على مسار العمل المستقل."
          : currentLang === 'FR'
          ? "Merci pour votre question ! Vous pouvez explorer la plateforme en cliquant sur 'Lancer la plateforme' ou sélectionner une question ci-dessous."
          : "Thank you for asking! You can explore the live platform directly by clicking 'Launch Your Workspace', or tap any question below to see our 24/7 autonomous pipeline in action.";
      }
      setMessages((m) => [...m, { role: 'bot', text: reply }]);
    }, 600);
  };

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 9999 }} className="landing-chat-widget flex flex-col items-end gap-2 max-w-[calc(100vw-24px)]">
      {open && (
        <div
          dir={currentLang === 'AR' ? 'rtl' : 'ltr'}
          className="landing-chat-window w-[calc(100vw-24px)] sm:w-[380px] max-w-[calc(100vw-24px)] sm:max-w-[380px] h-[460px] max-h-[calc(100vh-80px)] min-h-[260px] bg-[#0E1117]/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-800/80 flex items-center justify-between bg-gradient-to-r from-[#131722] via-[#11141D] to-[#0E1117] shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-sm shadow-inner shrink-0">
                ⚡
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#131722]" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block leading-tight">{t.title}</span>
                <span className="text-[10px] text-emerald-400 font-mono tracking-wider block mt-0.5">{t.status}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMessages([{ role: 'bot', text: t.welcome }])}
                title="Reset chat"
                className="text-[11px] text-slate-400 hover:text-white px-2 py-1 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 transition-colors font-medium"
              >
                {t.clearBtn}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-7 h-7 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs flex items-center justify-center border border-slate-800/80 transition-colors"
                aria-label="Close chat"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Preview Banner */}
          <div className="px-3.5 sm:px-4 py-1.5 bg-slate-900/60 border-b border-slate-800/60 flex items-center justify-between shrink-0">
            <span className="text-[10.5px] text-slate-400 font-mono flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              {t.previewTag}
            </span>
          </div>

          {/* Messages body */}
          <div ref={scrollRef} className="flex-1 min-h-[60px] overflow-y-auto px-3.5 sm:px-4 py-3 flex flex-col gap-2.5 scrollbar-thin scrollbar-thumb-slate-800">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`text-xs sm:text-[13px] leading-relaxed px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-2xl max-w-[88%] shadow-sm ${
                  m.role === 'bot'
                    ? 'bg-[#141824]/90 text-slate-100 self-start rounded-tl-xs border border-slate-800'
                    : 'bg-gradient-to-r from-amber-600 to-amber-700 text-white self-end rounded-tr-xs shadow-md shadow-amber-950/30 font-medium'
                }`}
              >
                {m.text}
              </div>
            ))}
            {typing && (
              <div className="bg-[#141824]/90 text-slate-400 self-start rounded-2xl rounded-tl-xs px-3.5 py-2 text-xs border border-slate-800 flex items-center gap-2">
                <span className="text-[10.5px] font-mono text-emerald-400">{t.thinking}</span>
                <span className="inline-flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.15s]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.3s]" />
                </span>
              </div>
            )}
          </div>

          {/* Quick Prompt Chips */}
          <div className="border-t border-slate-800/80 px-3 py-2 bg-[#0D101A]/95 flex flex-col gap-1.5 max-h-[110px] overflow-y-auto shrink-0">
            <span className="text-[9.5px] font-mono font-bold text-slate-400 uppercase tracking-widest px-1">{t.quickTitle}</span>
            <div className="flex flex-col gap-1.5">
              {t.chips.map((c, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(c.q)}
                  className="text-left text-[11px] font-medium text-slate-300 bg-[#141824] hover:bg-[#1C2233] hover:text-white border border-slate-800/80 hover:border-amber-500/40 rounded-xl px-2.5 py-1.5 transition-all shadow-sm active:scale-[0.98] flex items-center justify-between group gap-2"
                >
                  <span className="truncate">{c.q}</span>
                  <span className="text-amber-500 opacity-70 group-hover:opacity-100 transition-opacity shrink-0">→</span>
                </button>
              ))}
            </div>
          </div>

          {/* Free-form Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 border-t border-slate-800/90 bg-[#111420]/95 flex items-center gap-2 shrink-0"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t.inputPlaceholder}
              className="flex-1 min-w-0 bg-[#0A0D14] border border-slate-800 focus:border-amber-500/60 text-white text-xs sm:text-[13px] rounded-xl px-3 py-2 outline-none transition-colors placeholder:text-slate-500"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              {t.sendBtn} →
            </button>
          </form>
        </div>
      )}

      {/* Sleek Floating Pill Button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 sm:gap-3 bg-[#0E1117] hover:bg-[#141824] border border-slate-700/80 hover:border-amber-500/50 rounded-full px-3.5 py-2 sm:px-4 sm:py-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_12px_40px_rgba(245,158,11,0.2)] transition-all duration-300 group hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
      >
        <span className="relative flex items-center justify-center w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/40 shadow-inner shrink-0">
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0E1117] animate-pulse" />
          <span className="text-base group-hover:rotate-12 transition-transform duration-300">⚡</span>
        </span>
        <div className="flex flex-col items-start text-left">
          <span className="text-xs sm:text-[13px] font-bold text-white group-hover:text-amber-400 transition-colors whitespace-nowrap">
            {open ? t.btnClose : t.btnOpen}
          </span>
          <span className="text-[9.5px] sm:text-[10px] font-mono text-slate-400 leading-none mt-0.5">{t.subtitle}</span>
        </div>
      </button>
    </div>
  );
}

/* ----------------------------------------------------------------------
   MAIN PAGE
---------------------------------------------------------------------- */
export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [uiLang, setUiLang] = useState<'EN' | 'FR' | 'AR'>('EN');
  const [agentLang, setAgentLang] = useState<'EN' | 'FR' | 'AR'>('EN');

  useEffect(() => {
    let active = true;

    const checkUserSession = async () => {
      let currentUser: any = null;

      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('fabrica_sandbox_user') : null;
      if (savedUser) {
        try {
          currentUser = JSON.parse(savedUser);
        } catch (e) {
          localStorage.removeItem('fabrica_sandbox_user');
        }
      }

      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            currentUser = session.user;
          }
        } catch (err) {
          console.warn('[landing] Session check error:', err);
        }
      }

      if (active && currentUser) {
        const key = `fabrica_onboarding_completed_${currentUser.id}`;
        const completed = localStorage.getItem(key) === 'true';
        if (completed) {
          router.push('/dashboard');
        } else {
          router.push('/onboard');
        }
      }
    };

    checkUserSession();

    let subscription: any = null;
    if (supabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          const user = session?.user;
          if (user) {
            const key = `fabrica_onboarding_completed_${user.id}`;
            const completed = localStorage.getItem(key) === 'true';
            if (completed) {
              router.push('/dashboard');
            } else {
              router.push('/onboard');
            }
          }
        });
        subscription = data.subscription;
      } catch (e) {
        console.warn('[landing] Auth state change error:', e);
      }
    }

    return () => {
      active = false;
      if (subscription) subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    setMounted(true);
    const savedUi = (localStorage.getItem('fabrica_ui_lang') as 'EN' | 'FR' | 'AR') || 'EN';
    setUiLang(savedUi);

    const savedAgent = (localStorage.getItem('fabrica_agent_lang') as 'EN' | 'FR' | 'AR') || 'EN';
    setAgentLang(savedAgent);

    const handleSyncLang = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setUiLang(customEvt.detail);
      } else {
        const current = (localStorage.getItem('fabrica_ui_lang') as 'EN' | 'FR' | 'AR') || 'EN';
        setUiLang(current);
      }
    };

    const handleSyncAgentLang = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setAgentLang(customEvt.detail);
      } else {
        const current = (localStorage.getItem('fabrica_agent_lang') as 'EN' | 'FR' | 'AR') || 'EN';
        setAgentLang(current);
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fabrica_ui_lang' && e.newValue) {
        setUiLang(e.newValue as 'EN' | 'FR' | 'AR');
      }
      if (e.key === 'fabrica_agent_lang' && e.newValue) {
        setAgentLang(e.newValue as 'EN' | 'FR' | 'AR');
      }
    };

    window.addEventListener('fabrica:ui-lang-change', handleSyncLang);
    window.addEventListener('fabrica:agent-lang-change', handleSyncAgentLang);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('fabrica:ui-lang-change', handleSyncLang);
      window.removeEventListener('fabrica:agent-lang-change', handleSyncAgentLang);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleUiLangChange = (lang: 'EN' | 'FR' | 'AR') => {
    setUiLang(lang);
    localStorage.setItem('fabrica_ui_lang', lang);
    window.dispatchEvent(new CustomEvent('fabrica:ui-lang-change', { detail: lang }));
  };

  const handleAgentLangChange = (lang: 'EN' | 'FR' | 'AR') => {
    setAgentLang(lang);
    localStorage.setItem('fabrica_agent_lang', lang);
    window.dispatchEvent(new CustomEvent('fabrica:agent-lang-change', { detail: lang }));
  };

  const [utcTime, setUtcTime] = useState<string>('2026-07-21 12:00:00 UTC');
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const [personaIdx, setPersonaIdx] = useState(0);
  const [workspacePanel, setWorkspacePanel] = useState<'A' | 'B' | 'C'>('B');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const personas = PERSONAS_MAP[uiLang] || PERSONAS_MAP.EN;
  const painPromise = PAIN_PROMISE_MAP[uiLang] || PAIN_PROMISE_MAP.EN;
  const sevenSteps = SEVEN_STEPS_MAP[uiLang] || SEVEN_STEPS_MAP.EN;
  const hardLaws = HARD_LAWS_MAP[uiLang] || HARD_LAWS_MAP.EN;
  const faqs = FAQS_MAP[uiLang] || FAQS_MAP.EN;
  const txt = LANDING_TEXT[uiLang] || LANDING_TEXT.EN;
  const pillars = PILLARS_MAP[uiLang] || PILLARS_MAP.EN;
  const systems = SYSTEMS_MAP[uiLang] || SYSTEMS_MAP.EN;
  const workspace = WORKSPACE_MAP[uiLang] || WORKSPACE_MAP.EN;
  const research = RESEARCH_MAP[uiLang] || RESEARCH_MAP.EN;
  const alwaysOn = ALWAYS_ON_MAP[uiLang] || ALWAYS_ON_MAP.EN;
  const maturity = MATURITY_MAP[uiLang] || MATURITY_MAP.EN;
  const security = SECURITY_MAP[uiLang] || SECURITY_MAP.EN;
  const cta = CTA_MAP[uiLang] || CTA_MAP.EN;

  const persona = personas[personaIdx] || personas[0];

  return (
    <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{ background: '#FAF9F6', color: '#1C1C1E', fontFamily: '"Inter", system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* NAV */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <div style={{ marginLeft: '5px' }}><FabricaLogo className="w-10 h-10" /></div>
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold tracking-wide text-slate-600">
            <a href="#matrix" className="hover:text-[#1C1C1E] transition-colors">{txt.nav.matrix}</a>
            <a href="#systems" className="hover:text-[#1C1C1E] transition-colors">{txt.nav.systems}</a>
            <a href="#workspace" className="hover:text-[#1C1C1E] transition-colors">{txt.nav.workspace}</a>
            <a href="#research" className="hover:text-[#1C1C1E] transition-colors">{txt.nav.deepResearch}</a>
            <a href="#faqs" className="hover:text-[#1C1C1E] transition-colors">{txt.nav.faqs}</a>
          </nav>
          <div className="flex items-center gap-3">
            {/* Language Selectors (UI & Agent Output) */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl px-2.5 py-1.5 shadow-sm transition-colors" title="UI Language Selector">
                <span className="text-xs">🌐 UI</span>
                <select
                  value={uiLang}
                  onChange={(e) => handleUiLangChange(e.target.value as 'EN' | 'FR' | 'AR')}
                  title="UI Language Selector (EN / FR / AR)"
                  className="bg-transparent text-slate-800 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="EN">EN</option>
                  <option value="FR">FR</option>
                  <option value="AR">AR</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300/80 rounded-xl px-2.5 py-1.5 shadow-sm transition-colors" title="AI Agent Output Language Selector">
                <span className="text-xs">🤖 Agent</span>
                <select
                  value={agentLang}
                  onChange={(e) => handleAgentLangChange(e.target.value as 'EN' | 'FR' | 'AR')}
                  title="Agent Output Language Selector (EN / FR / AR)"
                  className="bg-transparent text-amber-900 text-xs font-bold focus:outline-none cursor-pointer"
                >
                  <option value="EN">EN</option>
                  <option value="FR">FR</option>
                  <option value="AR">AR</option>
                </select>
              </div>
            </div>

            <Link href="/dashboard" className="px-7 py-3.5 bg-gradient-to-r from-[#1C1C1E] to-slate-900 hover:from-[#CC7A4A] hover:to-[#b2693e] text-white font-bold text-xs rounded-xl shadow-md hover:shadow-lg hover:shadow-[#CC7A4A]/20 transition-all duration-300 flex items-center gap-2 active:scale-95 border border-slate-700/50 whitespace-nowrap min-w-fit" style={{ marginRight: '0px', paddingRight: '5px', paddingBottom: '5px', paddingTop: '5px', paddingLeft: '5px' }}>
              <span>{txt.nav.openDashboard}</span>
              <span className="text-xs">➔</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 1. HERO — Banner 00 */}
      <section className="relative px-6 md:px-12 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center w-full" style={{ marginTop: '5px', marginBottom: '10px' }}>
        <div className="lg:col-span-7 flex flex-col items-start gap-6">
          <BootSequence />
          <div className="inline-flex items-center gap-2 bg-[#CC7A4A]/10 border border-[#CC7A4A]/30 rounded-full" style={{ marginLeft: '5px', paddingRight: '3px', paddingLeft: '3px' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#CC7A4A]" />
            <span className="text-[10px] font-extrabold text-[#CC7A4A] tracking-wider uppercase font-mono">
              {txt.hero.tag}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black tracking-tight text-[#1C1C1E] leading-[1.3]">
            {(() => {
              const spanGreen = "text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md inline-block mx-0.5 font-black";
              const spanAmber = "text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md inline-block mx-0.5 font-black";
              if (uiLang === 'FR') {
                return (
                  <>
                    Exécutez sur l'IA 24/7 <span className={spanAmber}>Autonomie et Échelle</span>. Rédigez, planifiez, exécutez et vérifiez -- <span className={spanGreen}>Surveillez</span> depuis un seul Tableau de bord, sans aucune configuration technique.
                  </>
                );
              }
              if (uiLang === 'AR') {
                return (
                  <>
                    انطلق مع الذكاء الاصطناعي 24/7 <span className={spanAmber}>استقلالية وتوسع</span>. صمّم، خطّط، نفّذ، ودقّق -- <span className={spanGreen}>راقب</span> من لوحة تحكم واحدة، وبدون أي تعقيدات تقنية.
                  </>
                );
              }
              return (
                <>
                  Run on 24/7 AI <span className={spanAmber}>Autonomy and Scale</span>. Draft, plan, execute, and verify -- <span className={spanGreen}>Monitor</span> from a single Dashboard, with zero technical setup.
                </>
              );
            })()}
          </h1>
          <p className="text-sm sm:text-base md:text-lg font-bold text-slate-600 leading-relaxed">
            {(() => {
              const spanBlue = "text-sky-700 bg-sky-500/10 border border-sky-500/20 px-1.5 py-0.5 rounded-md inline-block mx-0.5 font-black";
              const spanRose = "text-rose-700 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md inline-block mx-0.5 font-black";
              const spanAmber = "text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md inline-block mx-0.5 font-black";
              const spanGreen = "text-emerald-700 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md inline-block mx-0.5 font-black";
              if (uiLang === 'FR') {
                return (
                  <>
                    L'IA sait <span className={spanBlue}>raisonner</span>, le résultat est de la <span className={spanRose}>SLOP</span>. Arrêtez les <span className={spanAmber}>prompts</span>. Fabrica est votre Prochain <span className={spanGreen}>AI EXIT</span>.
                  </>
                );
              }
              if (uiLang === 'AR') {
                return (
                  <>
                    الذكاء الاصطناعي يعرف كيف <span className={spanBlue}>يفكر</span>، والمخرجات العادية <span className={spanRose}>سطحية (SLOP)</span>. توقف عن <span className={spanAmber}>التوجيه</span>. Fabrica هو خروجك القادم <span className={spanGreen}>AI EXIT</span>.
                  </>
                );
              }
              return (
                <>
                  AI knows how to <span className={spanBlue}>reason</span>, output is <span className={spanRose}>SLOP</span>. Stop <span className={spanAmber}>prompting</span>. Fabrica is your Next <span className={spanGreen}>AI EXIT</span>.
                </>
              );
            })()}
          </p>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
            {(() => {
              const spanAmber = "text-amber-700 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded-md inline-block mx-0.5 font-black";
              if (uiLang === 'FR') {
                return (
                  <>
                    si vous gérez encore des sessions <span className={spanAmber}>Business & Coding</span> manuellement avec des semaines de 80h, des fichiers & tableurs !
                  </>
                );
              }
              if (uiLang === 'AR') {
                return (
                  <>
                    إذا كنت ما زلت تدير جلسات <span className={spanAmber}>الأعمال والبرمجة</span> يدويًا بأسابيع عمل 80 ساعة، مع الملفات وجداول البيانات !
                  </>
                );
              }
              return (
                <>
                  if you still run <span className={spanAmber}>Business & Coding</span> sessions manualy with 80-hour work weeks, files & spreadsheets !
                </>
              );
            })()}
          </p>

          <div className="flex flex-wrap gap-2 pt-1 font-mono">
            {['4-Stage Autonomous Pipeline', '24/7 Autonomy Mode', 'Audited Storage Layer', 'Zero Technical Setup', 'Gemini · Claude · OpenRouter'].map((t, idx) => (
              <span key={t} className="bg-slate-100 text-slate-700 text-[10px] font-semibold py-1 rounded border border-slate-200" style={{ marginLeft: idx === 0 ? '5px' : '3px', paddingLeft: '2px', paddingRight: '2px' }}>
                {t}
              </span>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto pt-4">
            <Link href="/dashboard" className="group h-14 bg-gradient-to-r from-[#CC7A4A] to-[#b2693e] hover:from-[#b2693e] hover:to-[#96552f] text-white text-center font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#CC7A4A]/30 hover:shadow-xl hover:shadow-[#CC7A4A]/40 active:scale-[0.98] border border-[#CC7A4A]/40 whitespace-nowrap min-w-fit px-6">
              <span>{txt.hero.launchBtn}</span>
              <span className="group-hover:translate-x-1 transition-transform duration-200">➔</span>
            </Link>
            <a href="#systems" className="h-14 bg-white hover:bg-slate-50 border-2 border-slate-300 hover:border-slate-800 text-[#1C1C1E] text-center font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm hover:shadow-md active:scale-[0.98] whitespace-nowrap min-w-fit px-6">
              <span>{txt.hero.seeBuildsBtn}</span>
            </a>
          </div>
        </div>

        {/* Hero Visual Card — Banner 00 */}
        <div className="lg:col-span-5">
          <ImageCard
            src="/Fabrica%20Banner%2000.jpg"
            alt="Physical archived folders, smartphone capturing documents, and digital system screen"
            badge="Banner 00 // 4-Stage Autonomous Pipeline"
            aspect="aspect-[16/11]"
            blur={1}
          />
        </div>
      </section>

      {/* 2. CHOOSE YOUR PATH — Persona Module */}
      <section className="px-6 md:px-12 max-w-7xl mx-auto w-full" style={{ marginTop: '0px', marginBottom: '10px' }}>
        <div className="flex flex-wrap gap-3 mb-6" style={{ marginTop: '10px', marginBottom: '10px' }}>
          {personas.map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPersonaIdx(i)}
              className={`text-xs font-bold py-3.5 rounded-2xl border transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap min-h-[48px] ${
                i === personaIdx
                  ? 'bg-[#1C1C1E] text-white border-[#1C1C1E] shadow-md shadow-slate-900/10 scale-[1.02]'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400 hover:text-[#1C1C1E]'
              }`}
              style={{ marginLeft: '10px', paddingLeft: '5px', paddingRight: '5px' }}
            >
              <span className={`w-2 h-2 rounded-full ${i === personaIdx ? 'bg-[#CC7A4A]' : 'bg-slate-300'}`} />
              {p.tab}
            </button>
          ))}
        </div>
        <div className="bg-gradient-to-br from-white via-slate-50/50 to-white border border-slate-200/90 rounded-3xl p-6 md:p-8 grid grid-cols-1 md:grid-cols-3 gap-6 shadow-xl shadow-slate-200/50 relative overflow-hidden" style={{ marginTop: '10px', marginBottom: '10px' }}>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200/80 pr-0 md:pr-6 pb-6 md:pb-0" style={{ marginLeft: '10px', paddingLeft: '5px', paddingRight: '5px' }}>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-200/60 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] font-mono font-bold text-red-600 uppercase tracking-wider">The Reality</span>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed" style={{ paddingTop: '2px', paddingBottom: '0px' }}>{persona.pain}</p>
          </div>
          <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-slate-200/80 pr-0 md:pr-6 pb-6 md:pb-0" style={{ marginLeft: '0px', paddingLeft: '5px', paddingRight: '5px' }}>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200/60 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono font-bold text-emerald-700 uppercase tracking-wider">Fabrica&apos;s Fix</span>
            </div>
            <p className="text-sm font-medium text-slate-800 leading-relaxed" style={{ paddingTop: '2px', paddingBottom: '2px' }}>{persona.fix}</p>
          </div>
          <div className="md:col-span-1 bg-slate-950 rounded-2xl p-5 flex flex-col justify-center items-center gap-2 border border-slate-800 shadow-inner" style={{ paddingTop: '0px', paddingBottom: '0px' }}>
            <span className="text-[10px] font-mono font-bold text-[#CC7A4A] uppercase tracking-widest">Concrete Proof</span>
            <span className="text-[11.5px] font-mono text-emerald-400 text-center leading-relaxed font-semibold">{persona.proof}</span>
          </div>
        </div>
      </section>

      {/* 3. PAIN / PROMISE MATRIX — Banner 01 */}
      <section id="matrix" className="relative border-t border-slate-800 px-6 md:px-12 overflow-hidden bg-slate-950">
        <AmbientBanner src="/Fabrica%20Banner%2001.jpg" alt="Developer at night surrounded by red error output" blur={12} />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ marginLeft: '12px', paddingLeft: '15px', paddingRight: '5px', marginRight: '0px', marginTop: '0px', paddingTop: '20px', paddingBottom: '20px', marginBottom: '20px' }}>
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="flex flex-col gap-3 w-full">
              <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase text-left" style={{ marginTop: '0px', paddingTop: '0px' }}>Every AI Tool Promises Memory</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white text-center">{txt.sections.painTitle}</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="hidden md:grid grid-cols-2 gap-3 text-[10px] font-mono uppercase tracking-wider text-slate-500 px-4">
                <span>Traditional AI Assistants</span>
                <span>The Fabrica Kernel</span>
              </div>
              {painPromise.map((row, i) => (
                <div key={i} className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-900/80 border border-slate-800 rounded-lg text-xs text-slate-400" style={{ paddingLeft: '5px', paddingTop: '1px', paddingBottom: '2px' }}>{row.pain}</div>
                  <div className="bg-slate-900/50 border border-emerald-900/50 rounded-lg text-xs text-slate-200" style={{ paddingLeft: '5px', paddingTop: '1px', paddingBottom: '2px' }}>{row.fix}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <ImageCard
              src="/Fabrica%20Banner%2001.jpg"
              alt="Developer late at night dealing with red errors and broken pipelines"
              badge="Banner 01 // The Context Amnesia Problem"
              aspect="aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* 4. THREE PILLARS: INPUT / AGENTIC TASK / OUTPUT */}
      <section className="bg-slate-900 text-white border-t border-slate-800 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-12" style={{ paddingTop: '15px', paddingBottom: '20px', paddingLeft: '35px' }}>
          <div className="max-w-3xl mx-auto text-center flex flex-col gap-3">
            <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase" style={{ paddingLeft: '0px', marginLeft: '0px', paddingTop: '0px' }}>{pillars.tag}</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white" style={{ marginLeft: '0px', paddingLeft: '25px' }}>{pillars.title}</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col gap-4" style={{ paddingLeft: '7px', paddingTop: '5px', paddingBottom: '7px' }}>
              <span className="text-xs font-bold bg-slate-800 text-slate-300 py-1 rounded w-fit font-mono" style={{ paddingLeft: '5px', paddingRight: '5px' }}>{pillars.col1Tag}</span>
              <h3 className="text-xl font-black text-white">{pillars.col1H3}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pillars.col1Desc}</p>
              <div className="flex flex-col gap-2.5 mt-1 text-xs text-slate-300">
                {pillars.col1Items.map((item, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-3">{item}</div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col gap-4" style={{ paddingLeft: '7px', paddingTop: '5px', paddingBottom: '7px' }}>
              <span className="text-xs font-bold bg-[#CC7A4A]/20 text-[#CC7A4A] py-1 rounded border border-[#CC7A4A]/30 w-fit font-mono" style={{ paddingLeft: '5px', paddingRight: '5px' }}>{pillars.col2Tag}</span>
              <h3 className="text-xl font-black text-white">{pillars.col2H3}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pillars.col2Desc}</p>
              <div className="flex flex-col gap-2 mt-1 text-xs text-slate-300">
                {pillars.col2Items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 bg-slate-900/40 p-2 rounded border border-slate-800">{item}</div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col gap-4" style={{ paddingLeft: '7px', paddingTop: '5px', paddingBottom: '7px' }}>
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-400 py-1 rounded border border-emerald-500/30 w-fit font-mono" style={{ paddingLeft: '5px', paddingRight: '5px' }}>{pillars.col3Tag}</span>
              <h3 className="text-xl font-black text-white">{pillars.col3H3}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{pillars.col3Desc}</p>
              <div className="flex flex-col gap-2.5 mt-1">
                {pillars.col3Items.map((item, idx) => (
                  <div key={idx} className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-xs text-slate-300">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. DIGITAL TRANSFORMATION & CUSTOM SYSTEMS — Banner 03 */}
      <section id="systems" className="relative px-6 md:px-12 bg-slate-950 text-white overflow-hidden">
        <AmbientBanner src="/Fabrica%20Banner%2003.jpg" alt="Node graph architecture" blur={14} />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ paddingLeft: '15px', paddingTop: '20px', paddingBottom: '20px', paddingRight: '0px' }}>
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="max-w-3xl flex flex-col gap-3">
              <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{systems.tag}</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">{systems.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-sm" style={{ paddingTop: '5px', paddingBottom: '5px', paddingLeft: '5px', paddingRight: '0px' }}>
                <span className="text-2xl">🏦</span>
                <h3 className="text-sm font-bold text-white mt-3 mb-1.5">{systems.c1H3}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{systems.c1Desc}</p>
                <span className="text-[10px] font-mono text-emerald-400">{systems.c1Foot}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-sm" style={{ paddingLeft: '5px', paddingTop: '5px', paddingRight: '0px', paddingBottom: '5px' }}>
                <span className="text-2xl">🔌</span>
                <h3 className="text-sm font-bold text-white mt-3 mb-1.5">{systems.c2H3}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{systems.c2Desc}</p>
                <span className="text-[10px] font-mono text-emerald-400">{systems.c2Foot}</span>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl backdrop-blur-sm" style={{ paddingLeft: '5px', paddingBottom: '5px', paddingTop: '5px' }}>
                <span className="text-2xl">🔗</span>
                <h3 className="text-sm font-bold text-white mt-3 mb-1.5">{systems.c3H3}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">{systems.c3Desc}</p>
                <span className="text-[10px] font-mono text-emerald-400">{systems.c3Foot}</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <ImageCard
              src="/Fabrica%20Banner%2003.jpg"
              alt="Live node graph mapping Slack ingestion, Model inference, Vector store writes, and persistence"
              badge="Banner 03 // Live Architecture Node Graph"
              aspect="aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* 6. INSIDE THE WORKSPACE — Banner 06 */}
      <section id="workspace" className="bg-white border-t border-slate-200 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ paddingTop: '20px', paddingBottom: '20px', paddingLeft: '25px' }}>
          <div className="lg:col-span-6 flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{workspace.tag}</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#1C1C1E]">{workspace.title}</h2>
              <p className="text-slate-600 text-sm md:text-base">{workspace.sub}</p>
            </div>

            <div className="flex gap-3 rounded-2xl border border-slate-200/90 w-fit" style={{ paddingLeft: '5px', paddingRight: '5px', paddingTop: '5px', paddingBottom: '5px' }}>
              {(['A', 'B', 'C'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setWorkspacePanel(p)}
                  className={`text-xs font-bold rounded-xl transition-all duration-200 flex items-center gap-2.5 whitespace-nowrap ${
                    workspacePanel === p
                      ? 'bg-[#1C1C1E] text-white shadow-md shadow-slate-900/20 scale-[1.02]'
                      : 'text-slate-600 hover:text-[#1C1C1E] hover:bg-white/60'
                  }`}
                  style={{ paddingLeft: '5px', paddingRight: '10px', paddingTop: '5px', paddingBottom: '5px' }}
                >
                  <span className={`w-2 h-2 rounded-full ${workspacePanel === p ? 'bg-[#CC7A4A]' : 'bg-slate-400'}`} />
                  Panel {p}
                </button>
              ))}
            </div>

            <div className="bg-slate-950 text-white border border-slate-800 rounded-2xl shadow-2xl min-h-[260px] flex flex-col justify-between" style={{ paddingTop: '5px', paddingRight: '10px', paddingLeft: '10px', paddingBottom: '5px' }}>
              {workspacePanel === 'A' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      {workspace.panelA}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded" style={{ paddingRight: '5px', paddingLeft: '5px' }}>v2.4 Kernel Map</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{workspace.panelADesc}</p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-2 bg-slate-900/80 border border-slate-800 p-3.5 rounded-xl font-mono text-[11px]">
                    <div className="rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1" style={{ paddingLeft: '5px', paddingTop: '5px', paddingRight: '5px', paddingBottom: '5px' }}>
                      <span className="text-[9px] text-slate-500 uppercase" style={{ paddingRight: '5px', paddingLeft: '5px' }}>Input Layer</span>
                      <span className="text-emerald-400 font-bold flex items-center gap-1" style={{ paddingLeft: '5px', paddingRight: '5px' }}>📥 Inbox Node</span>
                      <span className="text-[9.5px] text-slate-400">Multi-tenant webhook ingestion</span>
                    </div>
                    <div className="rounded-lg bg-slate-950 border border-[#CC7A4A]/50 flex flex-col gap-1 relative" style={{ paddingLeft: '5px', paddingRight: '5px', paddingBottom: '5px', paddingTop: '5px' }}>
                      <span className="text-[9px] text-[#CC7A4A] uppercase">Router Layer</span>
                      <span className="text-white font-bold flex items-center gap-1" style={{ paddingRight: '5px', paddingLeft: '5px' }}>⚡ Gateway Node</span>
                      <span className="text-[9.5px] text-slate-400">Model abstraction + Auth scope</span>
                    </div>
                    <div className="rounded-lg bg-slate-950 border border-slate-800 flex flex-col gap-1" style={{ paddingTop: '5px', paddingLeft: '5px', paddingBottom: '5px' }}>
                      <span className="text-[9px] text-slate-500 uppercase">Persistence</span>
                      <span className="text-purple-400 font-bold flex items-center gap-1">🗄️ OS Prompts/Data</span>
                      <span className="text-[9.5px] text-slate-400">Tenant-isolated JSON engine</span>
                    </div>
                  </div>
                </div>
              )}
              {workspacePanel === 'B' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#CC7A4A]" />
                      {workspace.panelB}
                    </h3>
                    <span className="text-[10px] font-mono text-emerald-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">12 Active Backlog Cards</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{workspace.panelBDesc}</p>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center mt-1">
                    {[
                      { name: 'Drafting', count: '3 missions', active: false },
                      { name: 'Planning', count: '2 active', active: false },
                      { name: 'Execution', count: '5 running', active: true },
                      { name: 'Archive', count: '24 compiled', active: false },
                    ].map((s) => (
                      <div
                        key={s.name}
                        className={`rounded-xl p-2.5 flex flex-col items-center gap-1 transition-all ${
                          s.active
                            ? 'bg-gradient-to-b from-[#CC7A4A] to-[#b2693e] text-white shadow-lg shadow-[#CC7A4A]/20 border border-[#CC7A4A]'
                            : 'bg-slate-900 border border-slate-800 text-slate-300'
                        }`}
                      >
                        <span className="text-[11px] font-bold font-mono uppercase">{s.name}</span>
                        <span className={`text-[9.5px] font-mono ${s.active ? 'text-white/90' : 'text-slate-500'}`}>{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {workspacePanel === 'C' && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      {workspace.panelC}
                    </h3>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">RLS Multi-Tenant Split</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-1">{workspace.panelCDesc}</p>
                  
                  <div className="flex flex-col sm:flex-row rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                    <div className="flex-1 bg-slate-900/90 p-3.5 text-xs font-bold text-slate-200 border-b sm:border-b-0 sm:border-r border-slate-800 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span>{workspace.dataTitle}</span>
                        <span className="text-[9px] font-mono text-amber-400 bg-amber-950/60 border border-amber-800/60 px-1.5 py-0.5 rounded">raw_data</span>
                      </div>
                      <span className="text-[10.5px] font-normal text-slate-400 font-mono">{workspace.dataSub}</span>
                    </div>
                    <div className="flex-1 bg-slate-950 p-3.5 text-xs font-bold text-emerald-400 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span>{workspace.sysTitle}</span>
                        <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.5 rounded">system_components</span>
                      </div>
                      <span className="text-[10.5px] font-normal text-slate-400 font-mono">{workspace.sysSub}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <ImageCard
              src="/Fabrica%20Banner%2006.jpg"
              alt="Mission pipeline visual showing four glowing blocks in sequence"
              badge="Banner 06 // The Mission Pipeline Engine"
              aspect="aspect-[16/10]"
            />
          </div>
        </div>
      </section>

      {/* 7. THE 7-STEP DRAFTING PIPELINE & QA GATE — Banner 04 */}
      <section className="bg-slate-950 text-white border-t border-slate-800 px-6 md:px-12 relative overflow-hidden">
        <AmbientBanner src="/Fabrica%20Banner%2004.jpg" alt="Three glowing options floating above desk" blur={14} />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ paddingTop: '15px', paddingBottom: '15px', paddingLeft: '10px' }}>
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{txt.sections.pipelineTag}</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">{txt.sections.pipelineTitle}</h2>
              <p className="text-slate-400 text-sm max-w-2xl">{txt.sections.pipelineSub}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2.5 pb-2">
              {sevenSteps.map((s, i) => (
                <div
                  key={s.k}
                  className={`rounded-xl flex flex-col justify-between gap-2 border transition-all duration-300 hover:scale-[1.03] ${
                    s.gate
                      ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-[#CC7A4A] text-white shadow-xl shadow-[#CC7A4A]/25 ring-1 ring-[#CC7A4A]/50'
                      : 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                  style={{ paddingLeft: '5px', paddingTop: '5px', paddingRight: '5px', paddingBottom: '5px' }}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-mono font-black px-1.5 py-0.5 rounded-full ${s.gate ? 'bg-[#CC7A4A] text-white' : 'bg-slate-800 text-slate-400'}`}>
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    {s.gate && <span className="text-[8.5px] font-mono uppercase text-[#CC7A4A] font-extrabold animate-pulse" style={{ paddingRight: '10px' }}>● GATE</span>}
                  </div>
                  <div>
                    <span className="text-[11.5px] font-black block mb-0.5 text-white leading-tight">{s.k}</span>
                    <span className="text-[10px] leading-relaxed opacity-85 text-slate-300 block">{s.d}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <ImageCard
              src="/Fabrica%20Banner%2004.jpg"
              alt="Three glowing holographic option cards hovering side-by-side above desk"
              badge="Banner 04 // Three Engineered Paths (QA Gate)"
              aspect="aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* 8. VERIFIED, NOT GUESSED (DEEP RESEARCH) — Banner 05 */}
      <section id="research" className="bg-white border-t border-slate-200 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ paddingTop: '5px', paddingBottom: '5px', paddingLeft: '5px' }}>
          <div className="lg:col-span-5 order-2 lg:order-1">
            <ImageCard
              src="/Fabrica%20Banner%2005.jpg"
              alt="Two data streams merging into a single verified beam feeding a keyboard"
              badge="Banner 05 // Deep Research Verification Engine"
              aspect="aspect-[4/3]"
            />
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-6">
            <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{research.tag}</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#1C1C1E]">{research.title}</h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              {research.desc}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="border border-slate-200 rounded-xl bg-slate-50" style={{ paddingTop: '5px', paddingBottom: '5px', paddingRight: '5px', paddingLeft: '5px' }}>
                <span className="text-xs font-bold text-[#1C1C1E] block mb-1">{research.c1H3}</span>
                <span className="text-xs text-slate-500">{research.c1Desc}</span>
              </div>
              <div className="border border-slate-200 rounded-xl bg-slate-50" style={{ paddingTop: '5px', paddingBottom: '5px', paddingRight: '5px', paddingLeft: '5px' }}>
                <span className="text-xs font-bold text-[#1C1C1E] block mb-1">{research.c2H3}</span>
                <span className="text-xs text-slate-500">{research.c2Desc}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 9. ALWAYS-ON AUTONOMOUS PARTNER — Banner 08 */}
      <section className="bg-slate-900 text-white border-t border-slate-800 px-6 md:px-12 relative overflow-hidden">
        <AmbientBanner src="/Fabrica%20Banner%2008.jpg" alt="Early morning desk with steaming coffee and soft notification glow" blur={10} />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ paddingLeft: '10px', paddingBottom: '10px', paddingTop: '10px' }}>
          <div className="lg:col-span-7 flex flex-col gap-6">
            <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{alwaysOn.tag}</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">{alwaysOn.title}</h2>
            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
              {alwaysOn.desc}
            </p>
            <div className="flex flex-wrap gap-3 pt-2 font-mono text-xs">
              <span className="bg-slate-950/80 border border-slate-800 text-emerald-400 rounded-lg" style={{ paddingLeft: '2px', paddingRight: '5px' }}>{alwaysOn.t1}</span>
              <span className="bg-slate-950/80 border border-slate-800 text-emerald-400 rounded-lg" style={{ paddingLeft: '2px', paddingRight: '5px' }}>{alwaysOn.t2}</span>
            </div>
          </div>

          <div className="lg:col-span-5">
            <ImageCard
              src="/Fabrica%20Banner%2008.jpg"
              alt="Early morning home office with laptop glowing quietly with completed task confirmation"
              badge="Banner 08 // Always-On Background Engine"
              aspect="aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* 10. AGENT KERNEL & ARCHITECTURE — Banner 02 */}
      <section className="relative px-6 md:px-12 bg-slate-950 text-white overflow-hidden">
        <AmbientBanner src="/Fabrica%20Banner%2002.jpg" alt="Hand connecting Synapse cable into device with neural node background" blur={16} />
        <div className="relative max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ paddingTop: '10px', paddingBottom: '10px', paddingLeft: '10px' }}>
          <div className="lg:col-span-7 flex flex-col gap-8">
            <div className="flex flex-col gap-3">
              <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{txt.sections.lawsTag}</span>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white">{txt.sections.lawsTitle}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hardLaws.map((law, idx) => (
                <div
                  key={law.t}
                  className="group bg-slate-900/90 hover:bg-slate-900 border border-slate-800 hover:border-[#CC7A4A]/60 rounded-2xl backdrop-blur-md transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-xl hover:shadow-[#CC7A4A]/10 flex flex-col gap-2 relative overflow-hidden"
                  style={{ paddingLeft: '5px', paddingTop: '5px', paddingRight: '5px', paddingBottom: '5px' }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#CC7A4A]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-extrabold text-white group-hover:text-[#CC7A4A] transition-colors">{law.t}</h3>
                    <span className="text-[10px] font-mono text-slate-500 group-hover:text-emerald-400">#{String(idx + 1).padStart(2, '0')}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{law.d}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5">
            <ImageCard
              src="/Fabrica%20Banner%2002.jpg"
              alt="Fiber synapse cable plugged into hardware device with glowing node network"
              badge="Banner 02 // Agent Kernel Synapse Engine"
              aspect="aspect-[4/3]"
            />
          </div>
        </div>
      </section>

      {/* 11. THE MATURITY LADDER — Banner 07 */}
      <section className="bg-white border-t border-slate-200 px-6 md:px-12">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center" style={{ paddingTop: '10px', paddingBottom: '10px', paddingLeft: '10px', paddingRight: '10px' }}>
          <div className="lg:col-span-5 order-2 lg:order-1">
            <ImageCard
              src="/Fabrica%20Banner%2007.jpg"
              alt="Four ascending stone blocks progressing from rough unpolished to polished glowing obsidian"
              badge="Banner 07 // The Tool Maturity Ladder"
              aspect="aspect-[4/3]"
            />
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-6">
            <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{cta.matTag}</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#1C1C1E]">{cta.matTitle}</h2>
            <p className="text-slate-600 text-sm md:text-base leading-relaxed">
              {cta.matDesc}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              {maturity.map((m, i) => (
                <div key={m.t} className="rounded-xl border border-slate-200 bg-slate-50 flex flex-col gap-1.5" style={{ paddingLeft: '5px', paddingBottom: '5px' }}>
                  <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full bg-[#CC7A4A]" style={{ width: `${((i + 1) / maturity.length) * 100}%` }} />
                  </div>
                  <span className="text-xs font-bold text-[#1C1C1E]">{m.t}</span>
                  <span className="text-[10px] text-slate-500 leading-tight">{m.d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 12. ENTERPRISE SECURITY & COMPLIANCE */}
      <section className="bg-slate-50 border-t border-slate-200 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col gap-10" style={{ paddingLeft: '10px', paddingRight: '10px', paddingTop: '10px', paddingBottom: '30px' }}>
          <div className="max-w-3xl flex flex-col gap-3">
            <span className="text-[10px] font-mono font-extrabold text-[#CC7A4A] tracking-wider uppercase">{cta.secTag}</span>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight text-[#1C1C1E]">{cta.secTitle}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {security.map((s) => (
              <div key={s.t} className="border border-slate-200 bg-white rounded-xl hover:shadow-md transition-shadow" style={{ paddingTop: '5px', paddingLeft: '5px', paddingRight: '5px', paddingBottom: '5px' }}>
                <div className="w-8 h-8 rounded-lg bg-[#CC7A4A]/10 flex items-center justify-center mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#CC7A4A]" />
                </div>
                <h3 className="text-sm font-bold text-[#1C1C1E] mb-2">{s.t}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 13. FAQ */}
      <section id="faqs" className="px-6 md:px-12 max-w-4xl mx-auto w-full">
        <h2 className="text-3xl font-black tracking-tight text-center text-[#1C1C1E]" style={{ paddingTop: '30px', paddingBottom: '30px', paddingLeft: '0px', marginLeft: '0px' }}>{cta.faqTitle}</h2>
        <div className="flex flex-col gap-4" style={{ marginLeft: '10px', paddingBottom: '50px' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-slate-200 bg-white rounded-lg overflow-hidden shadow-sm">
              <button
                onClick={() => setOpenFaqIdx(openFaqIdx === idx ? null : idx)}
                className="w-full text-left font-bold text-sm text-[#1C1C1E] flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 transition-colors"
                style={{ paddingLeft: '10px', paddingRight: '10px' }}
              >
                <span>{faq.q}</span>
                <span className="text-lg text-slate-400">{openFaqIdx === idx ? '−' : '+'}</span>
              </button>
              {openFaqIdx === idx && (
                <div className="px-6 py-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 bg-white">{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 14. FINAL CTA — Banner 09 */}
      <section className="relative px-6 md:px-12 overflow-hidden bg-slate-950 text-center">
        <AmbientBanner src="/Fabrica%20Banner%2009.jpg" alt="Day/Night bridge image showing desk fading from dark night to warm daylight" blur={10} />
        <div className="relative max-w-3xl mx-auto text-center flex flex-col items-center justify-center gap-6" style={{ paddingLeft: '0px', paddingBottom: '30px', paddingTop: '30px' }}>
          <h2 className="text-3xl md:text-5xl font-black tracking-tight text-white text-center">{cta.title}</h2>
          <p className="text-slate-300 text-sm md:text-base max-w-xl leading-relaxed text-center mx-auto">
            {cta.sub}
          </p>

          <div className="w-full max-w-md my-2 mx-auto" style={{ paddingLeft: '5px', paddingRight: '5px' }}>
            <ImageCard
              src="/Fabrica%20Banner%2009.jpg"
              alt="Desk transitioning from night to daylight with monitor acting as light bridge"
              badge="Banner 09 // Day & Night Operational Continuity"
              aspect="aspect-[21/9]"
            />
          </div>

          <Link href="/dashboard" className="h-14 bg-gradient-to-r from-[#CC7A4A] to-[#b2693e] hover:from-[#b2693e] hover:to-[#96552f] text-white text-center font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-[#CC7A4A]/30 hover:shadow-[#CC7A4A]/40 hover:scale-[1.03] active:scale-[0.98] mx-auto border border-[#CC7A4A]/40 whitespace-nowrap min-w-fit" style={{ paddingLeft: '10px', paddingRight: '5px' }}>
            <span>{cta.btn}</span>
            <span className="text-sm">➔</span>
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-white py-12 px-6 md:px-12 mt-auto" style={{ paddingLeft: '10px', paddingRight: '10px' }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <FabricaLogo className="w-12 h-12" />
            <span className="text-[9px] text-slate-400 font-mono tracking-widest">{utcTime}</span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-4 text-xs text-slate-500 font-medium">
            <a href="mailto:fabrica.studio.contact@gmail.com" className="hover:text-[#CC7A4A] transition-colors flex items-center gap-1.5 font-mono text-[11px] bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              ✉️ fabrica.studio.contact@gmail.com
            </a>
            <span>{cta.footer}</span>
          </div>
        </div>
      </footer>

      {/* FLOATING CONCIERGE CHATBOT */}
      <ConciergeChatbot agentLang={agentLang} />
    </div>
  );
}
