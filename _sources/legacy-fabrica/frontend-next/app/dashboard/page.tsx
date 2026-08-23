'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../components/auth/supabase';
import { api, harnessApi } from '../../components/api';
import { missionsApi } from '../../components/missions/api';
import { getActiveTenantId } from '../../components/auth/api';
import { RuntimeYaml } from '../../components/harness/types';

const SkillsAndExtensions = dynamic(() => import('../../components/harness/SkillsAndExtensions'), { ssr: false });
import { AccountWorkspaceModal } from '../../components/auth/AccountWorkspaceModal';
import { ContextPickerModal, AttachedContextItem } from '../../components/harness/ContextPickerModal';
import { buildProvidersFromPiCli, FABRICA_POOL_MODELS, DEFAULT_PI_CLI_MODELS } from '../../components/harness/pi-models';
import { UserHarnessService } from '../../components/harness/user-harness';
import { listDriveFiles, fetchGoogleSheetAsCSV, fetchDriveFileContent } from '../../components/workspace/drive-api';
import { fetchGitHubContents, downloadGitHubFile, exportToGitHub } from '../../components/workspace/github-api';
import { RightPanel } from '../../components/workspace/RightPanel';
import LiveAppPreview from '../../components/preview/LiveAppPreview';
import { InlineCodeEditor } from '../../components/editor/InlineCodeEditor';
import { ContainerStatusBadge } from '../../components/tenant/ContainerStatusBadge';
import { AgentExecutionNotice } from '../../components/harness/AgentExecutionNotice';
import JSZip from 'jszip';

const consolidatedWorkflows = [
  {
    id: "planning",
    name: "Planning Phase",
    file: "phase-planning.md",
    desc: "Coordinates strategic design, feature mapping, and SWOT alignment.",
    triggers: ["Strategic milestones", "Manual activation"],
    inputs: ["Business pillars", "SWOT metrics", "Raw customer signals"],
    outputs: ["Concrete mission blueprints", "Execution timeline updates"]
  },
  {
    id: "execution",
    name: "Execution Phase",
    file: "phase-execution.md",
    desc: "Executes approved development tasks sequentially with transaction safety.",
    triggers: ["Approved strategic plans", "Autonomy mode activations"],
    inputs: ["Task specifications", "Code templates", "Relational database access"],
    outputs: ["Deployed components", "Database migration execution", "Verified features"]
  },
  {
    id: "build",
    name: "Build Mode",
    file: "mode-build.md",
    desc: "Governs system logic formulation, template synthesis, and structural file scaffolding.",
    triggers: ["Manual mode requests", "Code scaffolding milestones"],
    inputs: ["System design specifications", "Core logic criteria"],
    outputs: ["Production code files", "Generated package libraries"]
  },
  {
    id: "optimization",
    name: "Optimization Mode",
    file: "mode-optimization.md",
    desc: "Oversees software refactoring, continuous upgrades, security hardening, and query performance tuning.",
    triggers: ["Manual enhancement triggers", "Performance bottleneck discoveries"],
    inputs: ["Existing codebase", "Code review guidelines"],
    outputs: ["Hardened and refactored code modules", "Improved runtime efficiency"]
  },
  {
    id: "test",
    name: "Test Mode",
    file: "mode-test.md",
    desc: "Coordinates lint checks, automated test-suite compilation, and type safety validations.",
    triggers: ["Pre-release gates", "Verification milestones"],
    inputs: ["Active codebase", "Test suite criteria"],
    outputs: ["Automated validation matrices", "Test success audits"]
  },
  {
    id: "standard",
    name: "Standard Mission",
    file: "mission-standard.md",
    desc: "Executes structured software development and routine maintenance.",
    triggers: ["Mission blueprints ready for production"],
    inputs: ["Technical specs", "API keys", "Source files"],
    outputs: ["Verified source code", "System build artifacts"]
  },
  {
    id: "brainstorming",
    name: "Brainstorming Mode",
    file: "mode-brainstorming.md",
    desc: "Blends analytics, exploratory deep research, and intensive user QA gates to draft new system horizons.",
    triggers: ["Strategic pivot briefs", "Exploratory discovery goals"],
    inputs: ["Any input type (documents, research parameters, competitive signals, analytics records)"],
    outputs: ["Any output format (creative plans, feature mockups, architectural matrices, validated QA checklists)"]
  },
  {
    id: "deep_research",
    name: "Deep Research Mode",
    file: "mode-deep_research.md",
    desc: "Executes multi-vector technical scans, official documentation verification, and packages research.",
    triggers: ["Deep-dive knowledge requests", "Competitor scans"],
    inputs: ["Any input type (queries, competitor URLs, industry specifications, source files)"],
    outputs: ["Any output format (synthesized matrices, research papers, comparative spreadsheets)"]
  },
  {
    id: "analytics",
    name: "Analytics Mode",
    file: "mode-analytics.md",
    desc: "Gathers and parses unstructured log tables, error metrics, and support logs to identify bottlenecks.",
    triggers: ["Customer support ticket waves", "Unhandled API failures"],
    inputs: ["Support log CSVs", "Backend performance metrics", "Error stacktraces"],
    outputs: ["Prioritized bug backlogs", "Urgent engineering tasks"]
  },
  {
    id: "system_build",
    name: "System Build Pipeline",
    file: "pipeline-system_build.md",
    desc: "Refines high-fidelity features from customer briefs and PM inputs, moving from concept to production-grade deployment.",
    triggers: ["Customer feedback triggers"],
    inputs: ["PM interview responses", "Core problems list", "Success metrics"],
    outputs: ["Code snapshots", "Technical architecture design", "UAT specs"]
  },
  {
    id: "system_build_from_data",
    name: "System Build From Data Pipeline",
    file: "pipeline-system_build_from_data.md",
    desc: "Converts unstructured client datasets into production-grade database systems and interactive data dashboards.",
    triggers: ["Raw dataset updates", "Ingestion events"],
    inputs: ["Raw logs", "CSV sheets", "Document folders"],
    outputs: ["Database schemas", "Interactive charting panels", "Seeded tables"]
  },
  {
    id: "system_optimization",
    name: "System Optimization Pipeline",
    file: "pipeline-system_optimization.md",
    desc: "Enables self-optimizing code refactoring, schema improvements, and cost tuning on existing active systems.",
    triggers: ["Automated system triggers", "Ecosystem performance metrics"],
    inputs: ["Execution log summaries", "Infrastructure pricing guides", "Prompt telemetry"],
    outputs: ["Refactored LLM prompt guidelines", "Database migration suggestions"]
  },
  {
    id: "system_optimization_from_data",
    name: "System Optimization From Data Pipeline",
    file: "pipeline-system_optimization_from_data.md",
    desc: "Integrates raw unstructured data directly into upgraded operational software modules.",
    triggers: ["Incoming dataset waves", "Code audit requests"],
    inputs: ["Source code directories", "Unstructured performance logs", "API specifications"],
    outputs: ["Upgraded routes", "Normalized database fields", "Custom d3 metrics"]
  },
  {
    id: "system_test",
    name: "System Test Pipeline",
    file: "pipeline-system_test.md",
    desc: "Performs automated test-suite compilation, regression auditing, and code-correctness validations on active systems.",
    triggers: ["Pre-release software freezes", "Module updates"],
    inputs: ["Component source code", "Framework rules", "Jest specifications"],
    outputs: ["Test runner outputs", "Regression audits", "Validation matrices"]
  },
  {
    id: "system_test_from_data",
    name: "System Test From Data Pipeline",
    file: "pipeline-system_test_from_data.md",
    desc: "Uses raw unstructured files to build and run realistic behavioral and simulation tests.",
    triggers: ["Historical logs batch updates", "Continuous validation cron"],
    inputs: ["CSV transactional sheets", "Client-side telemetry datasets"],
    outputs: ["Simulation test reports", "Correctness metrics logs"]
  },
  {
    id: "pillar_alignment",
    name: "Pillar Alignment Workflow",
    file: "pillar_alignment.md",
    desc: "Maintains strict operational compliance with founder goals and core pillars.",
    triggers: ["Business pivot signals", "Founder strategy updates"],
    inputs: ["Strategy change documents", "Active pillars", "Core metrics"],
    outputs: ["Aligned business focus maps", "Refocused priority guides"]
  },
  {
    id: "sandbox_harness",
    name: "Sandbox Harness Workflow",
    file: "sandbox_harness.md",
    desc: "Safeguards execution by isolating and testing untrusted files in safe sandboxes.",
    triggers: ["Pre-release file checks", "Foreign code executions"],
    inputs: ["Raw code snippets", "Active framework rules", "Security guidelines"],
    outputs: ["Execution logs", "Safety exceptions reports"]
  },
  {
    id: "monetization_engine",
    name: "Monetization Engine Workflow",
    file: "monetization_engine.md",
    desc: "Oversees subscription structures, invoice calculations, and pricing policies.",
    triggers: ["SaaS pricing schedule changes", "Operator configurations"],
    inputs: ["Active customer usage files", "Stripe subscription tiers"],
    outputs: ["Invoice actions", "Adjusted monetization guidelines"]
  },
  {
    id: "feedback_aggregator",
    name: "Feedback Aggregator Workflow",
    file: "feedback_aggregator.md",
    desc: "Ingests and structures multi-channel customer sentiment reviews.",
    triggers: ["Weekly reviews batch updates", "Customer review signals"],
    inputs: ["Trustpilot rating files", "Support feedback forms", "Survey text"],
    outputs: ["Structured sentiment reports", "System bug backlog alerts"]
  },
  {
    id: "system_health_monitor",
    name: "System Health Monitor Workflow",
    file: "system_health_monitor.md",
    desc: "Maintains active sentinel checks on backend response times and up-times.",
    triggers: ["Server latency thresholds reached", "Periodic cron checks"],
    inputs: ["Backend error logs", "Uptime metrics", "Active API statuses"],
    outputs: ["System diagnostic reports", "Urgent failover instructions"]
  }
];

const DASHBOARD_TEXT = {
  EN: {
    heroTag: '⚡ YOUR BUSINESS OPERATIONS ENGINE',
    heroH1: 'What to build is an operations problem, not a technical one.',
    heroDesc: 'Fabrica establishes your operations hub. Business materials, spreadsheets & logs become structured systems for your build team.',
    pmInterview: 'PM Interview',
    signalIngest: 'Signal Ingest',
    livingSpec: 'Living Spec',
    agentPrompt: 'Agent Prompt',
    agentTab: '🤖 Agent',
    contextTab: '📄 Context',
    cacheTab: '⚡ Cache',
    btnNewSession: '+ New Session',
    chatPlaceholder: 'Ask a question or request a system build...',
    searchPlaceholder: 'Search…',
    btnNewMission: '+ New',
    allCategories: 'All Categories',
    allTypes: 'All Types',
    allStates: 'All States',
    allPriorities: 'All Priorities',
    colNew: '📝 NEW',
    colPlanning: '📋 PLANNING',
    colExecution: '⚡ EXECUTION',
    colDone: '✅ DONE',
    yourData: 'Sources',
    yourSystems: 'Deliveries',
    importBtn: '📥 Import',
    exportBtn: '📤 Export',
    userLabel: 'You',
    assistantLabel: 'Fabrica Assistant',
    thinkingLabel: 'Fabrica Agent is thinking...',

    // Bottombar
    editBacklog: "Edit Workspace Backlog",
    noBacklog: "No active goals set",
    editReviewQueue: "Edit Review Queue",
    noApprovals: "No approvals pending",
    badgeNew: "NEW",
    autonomyLabel: "Autonomy:",
    autoFull: "● FULL AUTO",
    autoSemi: "◒ SEMI-AUTO",
    autoSupervised: "○ SUPERVISED",
    toolsOn: "TOOLS ON",
    toolsOff: "TOOLS OFF",
    toolsBtn: "Skills & Integrations",
    accountBtn: "🔑 Account & API",
    logsBtn: "📟 Logs & DB",
    langTitle: "UI Language (EN/FR/AR)",
    themeTitle: "Toggle blueprint / space theme",
    activeFocus: "Switch active blueprint focus",

    // Agent Window / Panel
    chatSessions: "Chat Sessions",
    sessionReady: "READY",
    sessionNoKey: "NO KEY",
    reviewQueueTitle: "REVIEW QUEUE",
    clickToInject: "Click to inject as audit query",
    agentInputPlaceholder: "Ask the Fabrica Agent...",
    sendBtn: "Send",
    stopBtn: "Stop",
    webSearch: "Google Search Grounding",

    // Modals
    accountModalTitle: "Account, Workspace & API Credentials",
    accountModalDesc: "Manage your API keys, subscriptions, and team access",
    logsModalTitle: "Realtime Audit Logs",
    logsModalDesc: "Live event stream & database telemetry",
    backlogModalTitle: "Edit Workspace Backlog",
    backlogModalDesc: "Add, reorder, or remove active workspace objectives",
    reviewModalTitle: "Edit Review Queue",
    reviewModalDesc: "Manage items awaiting manual verification or signoff",
    backlogItemTitle: "Backlog Item Focus",
    reviewItemTitle: "Approval Request Detail",
    closeBtn: "Close",
    saveBtn: "Save",
    cancelBtn: "Cancel",
    addGoalBtn: "+ Add Goal",
    addVerificationBtn: "+ Add Verification Item",
    archiveBtn: "Archive Goal",
    injectChatBtn: "Inject to Chat",
    submitFeedbackBtn: "Submit Feedback",

    // Extended Modal Keys
    modalPostgresPayload: "🔍 Postgres Event Payload",
    labelTable: "Table",
    labelEventType: "Event Type",
    labelTimestamp: "Timestamp",
    labelEventLogId: "Event Log ID",
    labelNewRowState: "New Row State",
    labelOldRowState: "Previous Row State (Old)",
    btnClosePayload: "Close Payload Inspector",

    officialInvoice: "Official Invoice",
    billFrom: "BILL FROM:",
    billTo: "BILL TO CLIENT:",
    invoiceNo: "INVOICE NO:",
    invoiceDate: "DATE:",
    invoiceStatus: "STATUS:",
    paidViaStripe: "PAID VIA STRIPE",
    paymentMethod: "METHOD:",
    invoiceDesc: "DESCRIPTION",
    invoiceTotal: "TOTAL (USD)",
    planDesc: "Full isolation virtual tenant workspaces, dedicated model execution queues.",
    subtotal: "Subtotal:",
    salesTax: "Sales Tax / VAT (0%):",
    totalPaid: "Total Paid:",
    printReceipt: "🖨️ Print Receipt",
    downloadPdf: "⬇️ Download PDF",


    multiCredentials: "🔑 Multi-Provider Credentials",
    multiCredentialsDesc: "Proxy connections are encrypted. Saving personal credentials routes your active model requests directly to your provider tiers.",
    configured: "✓ CONFIGURED",
    notConfigured: "✗ NOT CONFIGURED",
    clearBtn: "Clear",
    geminiDesc: "Used for direct Google Gemini models.",
    openrouterDesc: "Used for DeepSeek V3, LLaMA 3.3, and multi-proxy Gemini models.",
    anthropicDesc: "Used for direct Claude-3.5 models.",
    profileQuotasTab: "📊 Profile & Quotas",
    stripeBillingTab: "💳 Subscription & Billing (Stripe)",
    modelIntelTitle: "preferred engine & model intel",
    preferredModelLabel: "Preferred LLM Model Engine",
    fetchingModels: "🔄 Fetching...",
    refreshModels: "🔄 Refresh Models",
    onlyFreeModels: "Only Free Models",
    autoFreeFallback: "Auto Free Fallback",
    selectedModelIntel: "🎯 Selected Model Intel",
    rateLimits: "Rate Limits:",
    proxyCost: "Proxy Cost:",

    systemLogsTab: "System Logs",
    realtimeDbTab: "Realtime DB Channel",
    filterLogsPlaceholder: "Type to filter log events...",
    filterAll: "all",
    filterSystem: "system",
    filterMission: "mission",
    clearLogsBtn: "Clear Logs",

    addMissionTitle: "Add New Blueprint Mission",
    addMissionDesc: "Inject a strategic or standard execution loop into",
    quickPresets: "Quick Presets (McKinsey Inspired)",
    missionIdLabel: "Mission ID (Slug)",
    categoryLabel: "Category",
    priorityLabel: "Priority",
    objectiveLabel: "Objective Statement",
    objectivePlaceholder: "Describe the mission goal, target outcomes, or instructions...",
    createMissionBtn: "Create Mission ➔",
    creatingBtn: "Creating...",

    importModalTitle: "Import Data / Projects",
    importLocalTab: "💻 Local File / Manual",
    importGoogleTab: "🌐 Google Workspace",
    importGithubTab: "🐈 GitHub Repository",
    ingestRawData: "Ingest Raw Data Source",
    systemCompSpecs: "System Component JSON Specs",

    exportModalTitle: "Export System Component",
    exportGithubTab: "🐈 GitHub Repository",
    exportGoogleTab: "🌐 Google Drive (Backup)",
    githubConnectionDetails: "🔧 GitHub Connection Details",
    githubOwnerLabel: "Owner / Organization",
    githubRepoLabel: "Repository Name",
    githubBranchLabel: "Branch",
    githubTokenLabel: "Personal Access Token (PAT)",
    githubAuthReady: "🔒 Authenticated & configured. Ready to write code directly to this branch.",
    githubCommitConfig: "⚙️ Component Selection & Commit Configuration",
    githubTargetCompLabel: "Target System Component",
    githubSelectCompPlaceholder: "-- Select Component to Push --",
    githubTargetPathLabel: "Target File Path in Repo",
    githubCommitMsgLabel: "Commit Message",
    githubPushBtn: "🚀 Push Code to GitHub",
    githubPushingBtn: "📤 Committing directly to branch...",
    googleExportComingSoon: "Exporting to Google Workspace (Coming Soon)",
    googleExportComingSoonDesc: "Google Drive backups, Sheet synchronization, and Document spec exports are being prepared for high-fidelity export targets. Please use GitHub Repository integration to save code segments in the meantime.",

    backlogDesc: "Define the prioritized roadmap of goals and intent models that guide the AI development. Click ▲ or ▼ to change priority.",
    noGoalsDefined: "No goals defined. Click 'Add Strategic Goal' to begin.",
    typeGoalPlaceholder: "Type new strategic goal here...",
    saveIntentBtn: "💾 Save Intent",
    savingBtn: "Saving...",

    reviewDesc: "Manage active verification queue items. Click ▲ or ▼ to change priority.",
    noReviewsPending: "No reviews pending. Click 'Add Review Item' to begin.",
    typeReviewPlaceholder: "Type new review item here...",
    addItemBtn: "＋ Add Item",
    saveReviewBtn: "💾 Save Review Queue",

    strategicGoalLabel: "Strategic Goal",
    addInstructionsLabel: "✍️ Add Execution Instructions / Specifications",
    instructionsPlaceholder: "Provide execution details or custom context for the agent...",
    executeGoalBtn: "⚡ Execute Goal / Send to Agent",
    archiveGoalBtn: "🗑️ Archive / Delete Goal",

    targetComponentLabel: "Target Component / Task",
    descriptionLabel: "Description:",
    lastFeedbackLabel: "Last Feedback submitted:",
    writeResponseLabel: "✍️ Write Review Response / Feedback",
    reviewFeedbackPlaceholder: "Provide feedback on this implementation...",
    submitResponseBtn: "✉️ Submit Response to Agent",
    markDoneBtn: "✅ Mark Done & Resolve Component",
    closeReviewLaterBtn: "Close & Review Later",

    missionIdLabelHeader: "MISSION ID:",
    typeLabelHeader: "TYPE:",
    pipelinePhaseStepper: "📈 Pipeline Phase Stepper (Click step to advance/revert)",
    activeStepManifest: "⚡ Active Step Manifest",
    modeLabel: "Mode:",
    ingestsLabel: "📥 Ingests",
    outputsLabel: "📤 Outputs",
    qualityGatingAssessment: "Quality Gating Gated Assessment",
    activateQaGate: "Activate QA Gate",
    selectVerificationOption: "Select Verification Option:",
    customAssessmentFeedback: "Custom Assessment Feedback:",
    typeCustomRulesPlaceholder: "Type custom assessment rules, feedback, or blocks...",
    resolveQualityGateCompleteness: "✓ Resolve Quality Gate Completeness",
    submitAssessmentReconcile: "✓ Submit Assessment & Reconcile",
    missionCategoryType: "Mission Category / Type",
    priorityLevel: "Priority Level",
    kanbanLaneStatus: "📋 Kanban Lane Status",
    lineageLogicTitle: "💡 FABRICA SOURCES & DELIVERIES LOGIC",
    rawDataExplain: "📥 Sources: Structured & unstructured context assets (Discovery & Scoping, Deep Research, Data Analysis, Strategic Synthesis).",
    systemCompExplain: "📦 Deliveries: Executable codebases, database schemas, automations, and review gates (Executions, Reviews, Completed).",
    blueprintLineageMap: "🗺️ Blueprint Lineage Map",
    showingPortfolio: "👁️ Showing Portfolio",
    filteredToMission: "🔗 Filtered to Mission"
  },
  FR: {
    heroTag: '⚡ MOTEUR D’OPÉRATIONS D’ENTREPRISE',
    heroH1: 'Ce qu’il faut construire est un problème d’opérations, pas technique.',
    heroDesc: 'Fabrica établit votre centre d’opérations. Les documents, tableurs et journaux deviennent des systèmes structurés pour votre équipe.',
    pmInterview: 'Entretien PM',
    signalIngest: 'Ingestion Signal',
    livingSpec: 'Spécification Vivante',
    agentPrompt: 'Prompt d’Agent',
    agentTab: '🤖 Agent',
    contextTab: '📄 Contexte',
    cacheTab: '⚡ Cache',
    btnNewSession: '+ Nouvelle Session',
    chatPlaceholder: 'Posez une question ou demandez un développement...',
    searchPlaceholder: 'Chercher…',
    btnNewMission: '+ Nouveau',
    allCategories: 'Toutes Catégories',
    allTypes: 'Tous Types',
    allStates: 'Tous Statuts',
    allPriorities: 'Toutes Priorités',
    colNew: '📝 NOUVEAU',
    colPlanning: '📋 PLANIFICATION',
    colExecution: '⚡ EXÉCUTION',
    colDone: '✅ TERMINÉ',
    yourData: 'Sources',
    yourSystems: 'Livrables',
    importBtn: '📥 Importer',
    exportBtn: '📤 Exporter',
    userLabel: 'Vous',
    assistantLabel: 'Assistant Fabrica',
    thinkingLabel: 'L’agent Fabrica réfléchit...',

    // Bottombar
    editBacklog: "Éditer le Backlog du Système",
    noBacklog: "Aucun objectif actif défini",
    editReviewQueue: "Éditer la File de Révision",
    noApprovals: "Aucune approbation en attente",
    badgeNew: "NOUVEAU",
    autonomyLabel: "Autonomie du Système :",
    autoFull: "● AUTO COMPLET",
    autoSemi: "◒ SEMI-AUTO",
    autoSupervised: "○ SUPERVISÉ",
    toolsOn: "OUTILS ACTIFS",
    toolsOff: "OUTILS INACTIFS",
    toolsBtn: "Compétences & Intégrations",
    accountBtn: "🔑 Compte & API",
    logsBtn: "📟 Journaux & BDD",
    langTitle: "Langue de l'interface (EN/FR/AR)",
    themeTitle: "Basculer le thème blueprint / espace",
    activeFocus: "Changer l'orientation du plan actif",

    // Agent Window / Panel
    chatSessions: "Sessions de Chat",
    sessionReady: "PRÊT",
    sessionNoKey: "SANS ClÉ",
    reviewQueueTitle: "FILE DE RÉVISION",
    clickToInject: "Cliquer pour injecter comme requête d'audit",
    agentInputPlaceholder: "Poser une question à l'Agent Fabrica...",
    sendBtn: "Envoyer",
    stopBtn: "Arrêter",
    webSearch: "Recherche Google Ancrée",

    // Modals
    accountModalTitle: "Compte, Espace de Travail & Clés API",
    accountModalDesc: "Gérez vos clés API, abonnements et accès d'équipe",
    logsModalTitle: "Journaux d'Audit Système en Temps Réel",
    logsModalDesc: "Flux d'événements en direct et télémétrie de base de données",
    backlogModalTitle: "Éditer le Backlog du Système",
    backlogModalDesc: "Ajoutez, réorganisez ou supprimez les objectifs actifs",
    reviewModalTitle: "Éditer la File de Révision",
    reviewModalDesc: "Gérez les éléments en attente de vérification manuelle",
    backlogItemTitle: "Focus sur l'Élément du Backlog",
    reviewItemTitle: "Détail de la Demande d'Approbation",
    closeBtn: "Fermer",
    saveBtn: "Enregistrer",
    cancelBtn: "Annuler",
    addGoalBtn: "+ Ajouter un Objectif",
    addVerificationBtn: "+ Ajouter un Élément de Vérification",
    archiveBtn: "Archiver l'Objectif",
    injectChatBtn: "Injecter dans le Chat",
    submitFeedbackBtn: "Soumettre les Commentaires",

    // Extended Modal Keys
    modalPostgresPayload: "🔍 Contenu de l’Événement Postgres",
    labelTable: "Table",
    labelEventType: "Type d’Événement",
    labelTimestamp: "Horodatage",
    labelEventLogId: "ID de Journal",
    labelNewRowState: "Nouvel État de Ligne",
    labelOldRowState: "État Précédent (Ancien)",
    btnClosePayload: "Fermer l’Inspecteur",

    officialInvoice: "Facture Officielle",
    billFrom: "ÉMIS PAR :",
    billTo: "FACTURÉ À :",
    invoiceNo: "N° FACTURE :",
    invoiceDate: "DATE :",
    invoiceStatus: "STATUT :",
    paidViaStripe: "PAYÉ VIA STRIPE",
    paymentMethod: "MOYEN :",
    invoiceDesc: "DESCRIPTION",
    invoiceTotal: "TOTAL (USD)",
    planDesc: "Espaces de travail locataires virtuels isolés, files d’attente dédiées au modèle.",
    subtotal: "Sous-total :",
    salesTax: "TVA / Taxe (0%) :",
    totalPaid: "Total Payé :",
    printReceipt: "🖨️ Imprimer Reçu",
    downloadPdf: "⬇️ Télécharger PDF",


    multiCredentials: "🔑 Identifiants Multi-Fournisseurs",
    multiCredentialsDesc: "Les connexions proxy sont chiffrées. Enregistrer des clés personnelles achemine vos requêtes directement sur vos abonnements.",
    configured: "✓ CONFIGURÉ",
    notConfigured: "✗ NON CONFIGURÉ",
    clearBtn: "Effacer",
    geminiDesc: "Utilisé pour les modèles Google Gemini directs.",
    openrouterDesc: "Utilisé pour DeepSeek V3, LLaMA 3.3 et les modèles Gemini via proxy.",
    anthropicDesc: "Utilisé pour les modèles Claude-3.5 directs.",
    profileQuotasTab: "📊 Profil & Quotas",
    stripeBillingTab: "💳 Abonnement & Facturation (Stripe)",
    modelIntelTitle: "Moteur préféré & Informations modèle",
    preferredModelLabel: "Moteur de Modèle LLM Préféré",
    fetchingModels: "🔄 Chargement...",
    refreshModels: "🔄 Actualiser Modèles",
    onlyFreeModels: "Modèles Gratuits Uniquement",
    autoFreeFallback: "Basculement Gratuit Auto",
    selectedModelIntel: "🎯 Info Modèle Sélectionné",
    rateLimits: "Limites de Débit :",
    proxyCost: "Coût Proxy :",

    systemLogsTab: "Journaux Système",
    realtimeDbTab: "Canal BDD Temps Réel",
    filterLogsPlaceholder: "Tapez pour filtrer les événements...",
    filterAll: "tous",
    filterSystem: "système",
    filterMission: "mission",
    clearLogsBtn: "Effacer Journaux",

    addMissionTitle: "Ajouter une Mission Blueprint",
    addMissionDesc: "Injecter une boucle d’exécution stratégique ou standard dans",
    quickPresets: "Préréglages Rapides (Inspiré McKinsey)",
    missionIdLabel: "ID de Mission (Slug)",
    categoryLabel: "Catégorie",
    priorityLabel: "Priorité",
    objectiveLabel: "Énoncé de l’Objectif",
    objectivePlaceholder: "Décrivez l’objectif de la mission, les résultats visés ou les instructions...",
    createMissionBtn: "Créer la Mission ➔",
    creatingBtn: "Création...",

    importModalTitle: "Importer Données / Systèmes",
    importLocalTab: "💻 Fichier Local / Manuel",
    importGoogleTab: "🌐 Google Workspace",
    importGithubTab: "🐈 Dépôt GitHub",
    ingestRawData: "Ingérer Source de Données Brutes",
    systemCompSpecs: "Spécifications JSON Composant Système",

    exportModalTitle: "Exporter Composant Système",
    exportGithubTab: "🐈 Dépôt GitHub",
    exportGoogleTab: "🌐 Google Drive (Sauvegarde)",
    githubConnectionDetails: "🔧 Détails de Connexion GitHub",
    githubOwnerLabel: "Propriétaire / Organisation",
    githubRepoLabel: "Nom du Dépôt",
    githubBranchLabel: "Branche",
    githubTokenLabel: "Jeton d’Accès Personnel (PAT)",
    githubAuthReady: "🔒 Authentifié & configuré. Prêt à écrire le code directement sur cette branche.",
    githubCommitConfig: "⚙️ Sélection Composant & Config Commit",
    githubTargetCompLabel: "Composant Système Cible",
    githubSelectCompPlaceholder: "-- Sélectionner Composant à Pousser --",
    githubTargetPathLabel: "Chemin du Fichier Cible dans le Dépôt",
    githubCommitMsgLabel: "Message de Commit",
    githubPushBtn: "🚀 Pousser Code vers GitHub",
    githubPushingBtn: "📤 Envoi direct sur la branche...",
    googleExportComingSoon: "Exportation vers Google Workspace (Bientôt)",
    googleExportComingSoonDesc: "Sauvegardes Google Drive, synchronisation Sheets et exports Docs sont en préparation. Veuillez utiliser GitHub en attendant.",

    backlogDesc: "Définissez la feuille de route priorisée des objectifs. Cliquez sur ▲ ou ▼ pour modifier la priorité.",
    noGoalsDefined: "Aucun objectif défini. Cliquez sur 'Ajouter un Objectif Stratégique'.",
    typeGoalPlaceholder: "Tapez le nouvel objectif stratégique ici...",
    saveIntentBtn: "💾 Enregistrer l’Intention",
    savingBtn: "Enregistrement...",

    reviewDesc: "Gérez les éléments de la file de vérification. Cliquez sur ▲ ou ▼ pour modifier la priorité.",
    noReviewsPending: "Aucune révision en attente. Cliquez sur 'Ajouter un Élément'.",
    typeReviewPlaceholder: "Tapez le nouvel élément de révision ici...",
    addItemBtn: "＋ Ajouter Élément",
    saveReviewBtn: "💾 Enregistrer la File de Révision",

    strategicGoalLabel: "Objectif Stratégique",
    addInstructionsLabel: "✍️ Ajouter Instructions d’Exécution / Spécifications",
    instructionsPlaceholder: "Fournissez des détails d’exécution ou du contexte pour l’agent...",
    executeGoalBtn: "⚡ Exécuter l’Objectif / Envoyer à l’Agent",
    archiveGoalBtn: "🗑️ Archiver / Supprimer l’Objectif",

    targetComponentLabel: "Composant / Tâche Cible",
    descriptionLabel: "Description :",
    lastFeedbackLabel: "Dernier Commentaire Soumis :",
    writeResponseLabel: "✍️ Écrire une Réponse / Commentaire de Révision",
    reviewFeedbackPlaceholder: "Fournissez votre avis sur cette implémentation...",
    submitResponseBtn: "✉️ Soumettre Réponse à l’Agent",
    markDoneBtn: "✅ Marquer Terminé & Résoudre Composant",
    closeReviewLaterBtn: "Fermer & Réviser Plus Tard",

    missionIdLabelHeader: "ID MISSION :",
    typeLabelHeader: "TYPE :",
    pipelinePhaseStepper: "📈 Étapes du Pipeline (Cliquer pour avancer/reculer)",
    activeStepManifest: "⚡ Manifeste de l’Étape Active",
    modeLabel: "Mode :",
    ingestsLabel: "📥 Ingestions",
    outputsLabel: "📤 Sorties",
    qualityGatingAssessment: "Évaluation de la Porte de Qualité",
    activateQaGate: "Activer la Porte QA",
    selectVerificationOption: "Sélectionner une Option de Vérification :",
    customAssessmentFeedback: "Commentaire d’Évaluation Personnalisé :",
    typeCustomRulesPlaceholder: "Saisissez des règles d’évaluation personnalisées...",
    resolveQualityGateCompleteness: "✓ Résoudre la Complétude de la Porte QA",
    submitAssessmentReconcile: "✓ Soumettre Évaluation & Réconcilier",
    missionCategoryType: "Catégorie / Type de Mission",
    priorityLevel: "Niveau de Priorité",
    kanbanLaneStatus: "📋 Statut de la Colonne Kanban",
    lineageLogicTitle: "💡 LOGIQUE SOURCES & LIVRABLES FABRICA",
    rawDataExplain: "📥 Sources : Actifs de contexte et recherche (Découverte & Cadrage, Recherche Approfondie, Analyse de Données, Synthèse Stratégique).",
    systemCompExplain: "📦 Livrables : Code exécutable, schémas de BDD, automatisations et révisions (Exécutions, Révisions, Terminé).",
    blueprintLineageMap: "🗺️ Carte de Linéage du Blueprint",
    showingPortfolio: "👁️ Affichage du Portefeuille",
    filteredToMission: "🔗 Filtré sur la Mission"
  },
  AR: {
    heroTag: '⚡ محرك عمليات عملك',
    heroH1: 'تحديد ما يجب بناؤه مشكلة تشغيلية وليست تقنية.',
    heroDesc: 'تؤسس Fabrica مركز عملياتك. تتحول المواد والمستندات والجداول إلى أنظمة مهيكلة لفريق البناء لديك.',
    pmInterview: 'مقابلة مدير المنتج',
    signalIngest: 'استقبال الإشارات',
    livingSpec: 'المواصفات الحية',
    agentPrompt: 'أوامر العميل',
    agentTab: '🤖 العميل',
    contextTab: '📄 السياق',
    cacheTab: '⚡ الذاكرة المؤقتة',
    btnNewSession: '+ جلسة جديدة',
    chatPlaceholder: 'اسأل سؤالاً أو اطلب بناء نظام...',
    searchPlaceholder: 'بحث…',
    btnNewMission: '+ جديد',
    allCategories: 'جميع الفئات',
    allTypes: 'جميع الأنواع',
    allStates: 'جميع الحالات',
    allPriorities: 'جميع الأولويات',
    colNew: '📝 جديد',
    colPlanning: '📋 تخطيط',
    colExecution: '⚡ تنفيذ',
    colDone: '✅ مكتمل',
    yourData: 'المصادر',
    yourSystems: 'المخرجات',
    importBtn: '📥 استيراد',
    exportBtn: '📤 تصدير',
    userLabel: 'أنت',
    assistantLabel: 'مساعد Fabrica',
    thinkingLabel: 'جاري التفكير والأتمتة...',

    // Bottombar
    editBacklog: "تعديل المهام المؤجلة للنظام",
    noBacklog: "لا توجد أهداف نشطة محددة",
    editReviewQueue: "تعديل قائمة المراجعة",
    noApprovals: "لا توجد موافقات معلقة",
    badgeNew: "جديد",
    autonomyLabel: "الاستقلالية:",
    autoFull: "● تلقائي كامل",
    autoSemi: "◒ شبه تلقائي",
    autoSupervised: "○ تحت الإشراف",
    toolsOn: "الأدوات مفعّلة",
    toolsOff: "الأدوات معطّلة",
    toolsBtn: "المهارات والتكاملات",
    accountBtn: "🔑 الحساب و API",
    logsBtn: "📟 السجلات والبيانات",
    langTitle: "لغة الواجهة (EN/FR/AR)",
    themeTitle: "تبديل المظهر (مخطط / فضاء)",
    activeFocus: "تبديل تركيز المخطط النشط",

    // Agent Window / Panel
    chatSessions: "جلسات المحادثة",
    sessionReady: "جاهز",
    sessionNoKey: "بدون مفتاح",
    reviewQueueTitle: "قائمة المراجعة",
    clickToInject: "انقر للإدراج كاستعلام تدقيق",
    agentInputPlaceholder: "اسأل مساعد Fabrica...",
    sendBtn: "إرسال",
    stopBtn: "إيقاف",
    webSearch: "بحث جوجل المدعوم",

    // Modals
    accountModalTitle: "الحساب ومساحة العمل ووثائق API",
    accountModalDesc: "إدارة مفاتيح API والاشتراكات وصلاحيات الفريق",
    logsModalTitle: "سجلات تدقيق النظام المباشرة",
    logsModalDesc: "بث الأحداث المباشر وقياسات قاعدة البيانات",
    backlogModalTitle: "تعديل المهام المؤجلة للنظام",
    backlogModalDesc: "إضافة أو إعادة ترتيب أو إزالة الأهداف النشطة للنظام",
    reviewModalTitle: "تعديل قائمة المراجعة",
    reviewModalDesc: "إدارة العناصر التي تنتظر التحقق اليدوي أو الاعتماد",
    backlogItemTitle: "تفاصيل عنصر المهام",
    reviewItemTitle: "تفاصيل طلب الموافقة",
    closeBtn: "إغلاق",
    saveBtn: "حفظ",
    cancelBtn: "إلغاء",
    addGoalBtn: "+ إضافة هدف",
    addVerificationBtn: "+ إضافة عنصر تحقق",
    archiveBtn: "أرشفة الهدف",
    injectChatBtn: "إدراج في المحادثة",
    submitFeedbackBtn: "إرسال الملاحظات",

    // Extended Modal Keys
    modalPostgresPayload: "🔍 بيانات حدث بوسطجرس",
    labelTable: "الجدول",
    labelEventType: "نوع الحدث",
    labelTimestamp: "الطابع الزمني",
    labelEventLogId: "معرف سجل الحدث",
    labelNewRowState: "حالة السطر الجديد",
    labelOldRowState: "حالة السطر السابقة",
    btnClosePayload: "إغلاق مفتش البيانات",

    officialInvoice: "فاتورة رسمية",
    billFrom: "صادرة من:",
    billTo: "مفوترة للعميل:",
    invoiceNo: "رقم الفاتورة:",
    invoiceDate: "التاريخ:",
    invoiceStatus: "الحالة:",
    paidViaStripe: "مدفوعة عبر Stripe",
    paymentMethod: "طريقة الدفع:",
    invoiceDesc: "الوصف",
    invoiceTotal: "الإجمالي (USD)",
    planDesc: "مساحات عمل افتراضية معزولة وطوابير تنفيذ مخصصة للموديل.",
    subtotal: "المجموع الفرعي:",
    salesTax: "ضريبة المبيعات (0%):",
    totalPaid: "إجمالي المدفوع:",
    printReceipt: "🖨️ طباعة الإيصال",
    downloadPdf: "⬇️ تنزيل PDF",

    noToolboxMeta: "لم يتم تحميل بيانات أدوات للمخطط النشط.",
    multiCredentials: "🔑 بيانات اعتماد متعددة الموفرين",
    multiCredentialsDesc: "اتصالات الوكيل مشفرة. حفظ البيانات الشخصية يوجه طلبات الموديل مباشرة إلى اشتراكاتك.",
    configured: "✓ مفعل",
    notConfigured: "✗ غير مفعل",
    clearBtn: "مسح",
    geminiDesc: "مستخدم لنماذج Google Gemini المباشرة.",
    openrouterDesc: "مستخدم لـ DeepSeek V3 و LLaMA 3.3 ونماذج Gemini عبر الوكيل.",
    anthropicDesc: "مستخدم لنماذج Claude-3.5 المباشرة.",
    profileQuotasTab: "📊 الملف الشخصي والحصص",
    stripeBillingTab: "💳 الاشتراك والفوترة (Stripe)",
    modelIntelTitle: "المحرك المفضل ومعلومات الموديل",
    preferredModelLabel: "محرك نموذج LLM المفضل",
    fetchingModels: "🔄 جاري التحميل...",
    refreshModels: "🔄 تحديث النماذج",
    onlyFreeModels: "النماذج المجانية فقط",
    autoFreeFallback: "التحويل التلقائي للمجاني",
    selectedModelIntel: "🎯 معلومات النموذج المحدد",
    rateLimits: "حدود المعدل:",
    proxyCost: "تكلفة الوكيل:",

    systemLogsTab: "سجلات النظام",
    realtimeDbTab: "قناة BDD المباشرة",
    filterLogsPlaceholder: "اكتب لتصفية سجلات الأحداث...",
    filterAll: "الكل",
    filterSystem: "النظام",
    filterMission: "المهمة",
    clearLogsBtn: "مسح السجلات",

    addMissionTitle: "إضافة مهمة مخطط جديدة",
    addMissionDesc: "حقن حلقة تنفيذ استراتيجية أو قياسية في",
    quickPresets: "إعدادات مسبقة سريعة (مستوحاة من ماكينزي)",
    missionIdLabel: "معرف المهمة (Slug)",
    categoryLabel: "الفئة",
    priorityLabel: "الأولوية",
    objectiveLabel: "بيان الهدف",
    objectivePlaceholder: "صف هدف المهمة والنتائج المستهدفة أو التعليمات...",
    createMissionBtn: "إنشاء المهمة ➔",
    creatingBtn: "جاري الإنشاء...",

    importModalTitle: "استيراد البيانات / الأنظمة",
    importLocalTab: "💻 ملف محلي / يدوي",
    importGoogleTab: "🌐 Google Workspace",
    importGithubTab: "🐈 مستودع GitHub",
    ingestRawData: "استيعاب مصدر البيانات الخام",
    systemCompSpecs: "مواصفات JSON لمكون النظام",

    exportModalTitle: "تصدير مكون النظام",
    exportGithubTab: "🐈 مستودع GitHub",
    exportGoogleTab: "🌐 Google Drive (نسخ احتياطي)",
    githubConnectionDetails: "🔧 تفاصيل اتصال GitHub",
    githubOwnerLabel: "المالك / المنظمة",
    githubRepoLabel: "اسم المستودع",
    githubBranchLabel: "الفرع",
    githubTokenLabel: "رمز الوصول الشخصي (PAT)",
    githubAuthReady: "🔒 موثق ومعد. جاهز لكتابة الكود مباشرة في هذا الفرع.",
    githubCommitConfig: "⚙️ تحديد المكون وإعدادات التزام الكود",
    githubTargetCompLabel: "مكون النظام المستهدف",
    githubSelectCompPlaceholder: "-- اختر المكون لدفعه --",
    githubTargetPathLabel: "مسار الملف المستهدف في المستودع",
    githubCommitMsgLabel: "رسالة الالتزام",
    githubPushBtn: "🚀 دفع الكود إلى GitHub",
    githubPushingBtn: "📤 جاري الالتزام مباشرة في الفرع...",
    googleExportComingSoon: "التصدير إلى Google Workspace (قريباً)",
    googleExportComingSoonDesc: "جاري إعداد النسخ الاحتياطية لمستندات Google Drive وجداول البيانات. يرجى استخدام مستودع GitHub في الوقت الحالي.",

    backlogDesc: "حدد خريطة الطريق ذات الأولوية للأهداف ونماذج النوايا التي توجه التطوير. انقر على ▲ أو ▼ لتغيير الأولوية.",
    noGoalsDefined: "لم يتم تحديد أهداف. انقر على 'إضافة هدف استراتيجي' للبدء.",
    typeGoalPlaceholder: "اكتب الهدف الاستراتيجي الجديد هنا...",
    saveIntentBtn: "💾 حفظ النية",
    savingBtn: "جاري الحفظ...",

    reviewDesc: "إدارة عناصر قائمة التحقق النشطة. انقر على ▲ أو ▼ لتغيير الأولوية.",
    noReviewsPending: "لا توجد مراجعات معلقة. انقر على 'إضافة عنصر مراجعة' للبدء.",
    typeReviewPlaceholder: "اكتب عنصر المراجعة الجديد هنا...",
    addItemBtn: "＋ إضافة عنصر",
    saveReviewBtn: "💾 حفظ قائمة المراجعة",

    strategicGoalLabel: "الهدف الاستراتيجي",
    addInstructionsLabel: "✍️ إضافة تعليمات التنفيذ / المواصفات",
    instructionsPlaceholder: "قدم تفاصيل التنفيذ أو السياق المخصص للعميل...",
    executeGoalBtn: "⚡ تنفيذ الهدف / إرسال للعميل",
    archiveGoalBtn: "🗑️ أرشفة / حذف الهدف",

    targetComponentLabel: "المكون / المهمة المستهدفة",
    descriptionLabel: "الوصف:",
    lastFeedbackLabel: "آخر ملاحظة تم إرسالها:",
    writeResponseLabel: "✍️ كتابة استجابة المراجعة / الملاحظات",
    reviewFeedbackPlaceholder: "قدم ملاحظاتك حول هذا التنفيذ...",
    submitResponseBtn: "إرسال الاستجابة للعميل",
    markDoneBtn: "✅ تعليم كمكتمل وحل المكون",
    closeReviewLaterBtn: "إغلاق والمراجعة لاحقاً",

    missionIdLabelHeader: "معرف المهمة:",
    typeLabelHeader: "النوع:",
    pipelinePhaseStepper: "📈 مراحل خط الأنابيب (انقر على الخطوة للتقدم/التراجع)",
    activeStepManifest: "⚡ بيان الخطوة النشطة",
    modeLabel: "الوضع:",
    ingestsLabel: "📥 المدخلات",
    outputsLabel: "📤 المخرجات",
    qualityGatingAssessment: "تقييم بوابات الجودة",
    activateQaGate: "تفعيل بوابة الجودة",
    selectVerificationOption: "حدد خيار التحقق:",
    customAssessmentFeedback: "ملاحظات التقييم المخصصة:",
    typeCustomRulesPlaceholder: "اكتب قواعد التقييم المخصصة أو الملاحظات...",
    resolveQualityGateCompleteness: "✓ حل اكتمال بوابة الجودة",
    submitAssessmentReconcile: "✓ إرسال التقييم والتسوية",
    missionCategoryType: "فئة / نوع المهمة",
    priorityLevel: "مستوى الأولوية",
    kanbanLaneStatus: "📋 حالة عمود كانبان",
    lineageLogicTitle: "💡 منطق المصادر والمخرجات في FABRICA",
    rawDataExplain: "📥 المصادر: أصول السياق والأبحاث (الاستكشاف والتحديد، البحث العميق، تحليل البيانات، التركيب الاستراتيجي).",
    systemCompExplain: "📦 المخرجات: البرمجيات القابلة للتنفيذ، قواعد البيانات، الأتمتة ومراحل المراجعة (التنفيذ، المراجعات، المكتمل).",
    blueprintLineageMap: "🗺️ خريطة تسلسل المخطط",
    showingPortfolio: "👁️ عرض المحفظة",
    filteredToMission: "🔗 مصفاة حسب المهمة"
  }
};

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  // Category Label helper
  const getCategoryLabel = (category: string) => {
    const cat = String(category || '').toLowerCase();
    if (uiLang === 'AR') {
      switch (cat) {
        case 'standard': return 'قياسي';
        case 'full_pipeline': return 'مسار كامل';
        case 'quick_pipeline': return 'قفزة سريعة';
        case 'custom_entry_pipeline': return 'إدخال مخصص';
        case 'custom_selection_pipeline': return 'تحديد مخصص';
        case 'drafting': return 'صياغة';
        case 'planning': return 'تخطيط';
        case 'execution': return 'تنفيذ';
        case 'delivery': return 'تسليم';
        case 'brainstorming': return 'عصف ذهني';
        case 'deep_research': return 'بحث عميق';
        case 'analytics': return 'تحليلات';
        case 'system_build': return 'بناء نظام';
        default: return category;
      }
    }
    if (uiLang === 'FR') {
      switch (cat) {
        case 'standard': return 'Standard';
        case 'full_pipeline': return 'Pipeline Complet';
        case 'quick_pipeline': return 'Saut Rapide';
        case 'custom_entry_pipeline': return 'Entrée Personnalisée';
        case 'custom_selection_pipeline': return 'Sélection Personnalisée';
        case 'drafting': return 'Rédaction';
        case 'planning': return 'Planification';
        case 'execution': return 'Exécution';
        case 'delivery': return 'Livraison';
        case 'brainstorming': return 'Brainstorming';
        case 'deep_research': return 'Recherche Approfondie';
        case 'analytics': return 'Analytique';
        case 'system_build': return 'Construction Système';
        default: return category;
      }
    }
    switch (cat) {
      case 'standard': return 'Standard';
      case 'full_pipeline': return 'Full Pipeline';
      case 'quick_pipeline': return 'Quick Jump';
      case 'custom_entry_pipeline': return 'Custom Entry';
      case 'custom_selection_pipeline': return 'Custom Selection';
      case 'drafting': return 'Drafting';
      case 'planning': return 'Planning';
      case 'execution': return 'Execution';
      case 'delivery': return 'Delivery';
      case 'brainstorming': return 'Brainstorming';
      case 'deep_research': return 'Deep Research';
      case 'analytics': return 'Analytics';
      case 'system_build': return 'System Build';
      default: return category;
    }
  };

  const getStepsForCategory = (category: string) => {
    const cat = String(category || '').toLowerCase();
    if (cat === 'full_pipeline' || cat === 'quick_pipeline' || cat === 'custom_entry_pipeline' || cat === 'custom_selection_pipeline') {
      return getStepsForCategory('system_build');
    }
    if (cat === 'system_build') {
      return [
        { key: 'step_1_idea_analysis', label: '1. Idea Analysis', mode: 'Analytics', input: 'Concept Brief + Reference files', output: 'Functional Boundary Map' },
        { key: 'step_2_conceptual_research', label: '2. Conceptual Research', mode: 'Deep Research', input: 'Functional Boundary Map', output: 'Specs/Package versions' },
        { key: 'step_3_synthesis_qa_formulation', label: '3. QA Formulation', mode: 'Step-owned', input: 'Research Specs', output: '3 engineering design paths' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. QA User Gate', mode: 'User Gate', input: '3 design paths', output: 'Approved selected path' },
        { key: 'step_5_selection_analysis', label: '5. Selection Analysis', mode: 'Analytics', input: 'Selected Path + Specs', output: 'Folder layouts & DB Schema drafts' },
        { key: 'step_6_targeted_research', label: '6. Targeted Research', mode: 'Deep Research', input: 'Database Schema drafts', output: 'Verified code templates & specs' },
        { key: 'step_7_architectural_blueprint', label: '7. Blueprint Delivery', mode: 'Step-owned', input: 'Code templates', output: 'Architectural Blueprint JSON' },
        { key: 'planning', label: '8. Planning Phase', mode: 'Framework Phase', input: 'Architectural Blueprint JSON', output: 'Actionable sprint tasks' },
        { key: 'execution', label: '9. Active Execution', mode: 'Framework Phase', input: 'Sprint tasks', output: 'Deployed system component' }
      ];
    }
    if (cat === 'system_build_from_data') {
      return [
        { key: 'step_1_data_profiling', label: '1. Ingestion Profiling', mode: 'Analytics', input: 'Raw datasets/CSVs', output: 'Ingestion schema constraints' },
        { key: 'step_2_compliance_research', label: '2. Compliance Research', mode: 'Deep Research', input: 'Schema constraints', output: 'GDPR/Encryption standards' },
        { key: 'step_3_schema_qa_formulation', label: '3. Schema Formulation', mode: 'Step-owned', input: 'Ingestion constraints', output: '3 SQL/NoSQL schema designs' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Schema QA Gate', mode: 'User Gate', input: '3 schema options', output: 'Selected database schema' },
        { key: 'step_5_normalized_analytics', label: '5. Normalization Map', mode: 'Analytics', input: 'Selected schema', output: 'Foreign key relations & indexes' },
        { key: 'step_6_seeding_research', label: '6. Seeding Research', mode: 'Deep Research', input: 'Normalization map', output: 'Seeding scripts & dashboard APIs' },
        { key: 'step_7_seeded_dashboard_blueprint', label: '7. Seeded Blueprint', mode: 'Step-owned', input: 'Seeding scripts', output: 'Interactive Dashboard Blueprint' },
        { key: 'planning', label: '8. Planning Phase', mode: 'Framework Phase', input: 'Dashboard Blueprint', output: 'Migration & sprint tasks' },
        { key: 'execution', label: '9. Active Execution', mode: 'Framework Phase', input: 'Migration tasks', output: 'Live Database + Charting Dashboard' }
      ];
    }
    if (cat === 'system_optimization') {
      return [
        { key: 'step_1_bottleneck_profiling', label: '1. Bottleneck Profiling', mode: 'Analytics', input: 'System crash/CPU metrics', output: 'Bottleneck diagnostic summary' },
        { key: 'step_2_refactoring_research', label: '2. Refactoring Research', mode: 'Deep Research', input: 'Diagnostic summary', output: 'Framework upgrade alternatives' },
        { key: 'step_3_optimizations_qa_formulation', label: '3. Optimizations Formulation', mode: 'Step-owned', input: 'Upgrade alternatives', output: '3 caching/pooling strategies' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Optimization Gate', mode: 'User Gate', input: '3 strategies', output: 'Approved optimization strategy' },
        { key: 'step_5_refactoring_analytics', label: '5. Refactoring Plan', mode: 'Analytics', input: 'Approved strategy', output: 'Code refactoring specifications' },
        { key: 'step_6_telemetry_research', label: '6. Telemetry Research', mode: 'Deep Research', input: 'Refactoring specifications', output: 'Benchmark APIs & Prometheus rules' },
        { key: 'step_7_reconfigured_system_blueprint', label: '7. Reconfigured Blueprint', mode: 'Step-owned', input: 'Benchmark APIs', output: 'Reconfigured System Blueprint' },
        { key: 'planning', label: '8. Planning Phase', mode: 'Framework Phase', input: 'Reconfigured Blueprint', output: 'Refactoring tasks' },
        { key: 'execution', label: '9. Active Execution', mode: 'Framework Phase', input: 'Refactoring tasks', output: 'Optimized high-performance system' }
      ];
    }
    if (cat === 'system_optimization_from_data') {
      return [
        { key: 'step_1_telemetry_profiling', label: '1. Telemetry Profiling', mode: 'Analytics', input: 'Unstructured traffic logs', output: 'Pattern diagnostic summary' },
        { key: 'step_2_upgrade_research', label: '2. Upgrade Research', mode: 'Deep Research', input: 'Pattern diagnostic', output: 'Compression/API caching benchmarks' },
        { key: 'step_3_upgrades_qa_formulation', label: '3. Upgrade Formulation', mode: 'Step-owned', input: 'Benchmarks', output: '3 high-fidelity compression options' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Upgrade QA Gate', mode: 'User Gate', input: '3 compression options', output: 'Approved data compression strategy' },
        { key: 'step_5_upgrade_analytics', label: '5. Integration Analysis', mode: 'Analytics', input: 'Approved strategy', output: 'JSON/BSON payload schema mappings' },
        { key: 'step_6_dependency_research', label: '6. Dependency Scan', mode: 'Deep Research', input: 'Payload mappings', output: 'Optimized index structures' },
        { key: 'step_7_upgraded_blueprint', label: '7. Upgraded Blueprint', mode: 'Step-owned', input: 'Index structures', output: 'Upgraded Data Lineage Blueprint' },
        { key: 'planning', label: '8. Planning Phase', mode: 'Framework Phase', input: 'Upgraded Blueprint', output: 'Migration plan' },
        { key: 'execution', label: '9. Active Execution', mode: 'Framework Phase', input: 'Migration plan', output: 'Live optimized data module' }
      ];
    }
    if (cat === 'system_test') {
      return [
        { key: 'step_1_test_gap_analysis', label: '1. Test Gap Analysis', mode: 'Analytics', input: 'Code coverage gaps', output: 'Gap priority matrix' },
        { key: 'step_2_test_framework_research', label: '2. Framework Research', mode: 'Deep Research', input: 'Gap matrix', output: 'E2E testing framework benchmarks' },
        { key: 'step_3_test_qa_formulation', label: '3. Test Formulation', mode: 'Step-owned', input: 'Framework benchmarks', output: '3 mock/stub integration designs' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Test QA Gate', mode: 'User Gate', input: '3 mock designs', output: 'Approved E2E test plan' },
        { key: 'step_5_test_coverage_analytics', label: '5. Coverage Analysis', mode: 'Analytics', input: 'Approved E2E plan', output: 'Targeted assertion coverage maps' },
        { key: 'step_6_regression_research', label: '6. Regression Scan', mode: 'Deep Research', input: 'Coverage maps', output: 'Regression suite configuration parameters' },
        { key: 'step_7_test_audit_blueprint', label: '7. Test Audit Blueprint', mode: 'Step-owned', input: 'Configuration params', output: 'Automated Test Blueprint' },
        { key: 'planning', label: '8. Planning Phase', mode: 'Framework Phase', input: 'Automated Test Blueprint', output: 'Test suite backlog' },
        { key: 'execution', label: '9. Active Execution', mode: 'Framework Phase', input: 'Test suite backlog', output: 'Green validation report' }
      ];
    }
    if (cat === 'system_test_from_data') {
      return [
        { key: 'step_1_test_data_profiling', label: '1. Profile Test Data', mode: 'Analytics', input: 'Historical txn CSV sheets', output: 'Transaction telemetry map' },
        { key: 'step_2_simulation_research', label: '2. Simulation Research', mode: 'Deep Research', input: 'Telemetry map', output: 'Behavioral mock specifications' },
        { key: 'step_3_simulation_qa_formulation', label: '3. QA Formulation', mode: 'Step-owned', input: 'Mock specifications', output: '3 load simulation models' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Simulation Gate', mode: 'User Gate', input: '3 simulation models', output: 'Selected load model' },
        { key: 'step_5_behavioral_analytics', label: '5. Behavioral Analysis', mode: 'Analytics', input: 'Selected load model', output: 'Dynamic behavioral assertions' },
        { key: 'step_6_assert_research', label: '6. Assertion Research', mode: 'Deep Research', input: 'Behavioral assertions', output: 'Chaos-engineering parameter sets' },
        { key: 'step_7_simulation_blueprint', label: '7. Simulation Blueprint', mode: 'Step-owned', input: 'Chaos params', output: 'Final load simulation blueprint' },
        { key: 'planning', label: '8. Planning Phase', mode: 'Framework Phase', input: 'Load simulation blueprint', output: 'Load test setup tasks' },
        { key: 'execution', label: '9. Active Execution', mode: 'Framework Phase', input: 'Load test setup tasks', output: '100% stable traffic stress report' }
      ];
    }
    if (cat === 'analytics') {
      return [
        { key: 'step_1_data_ingestion', label: '1. Ingestion & Profiling', mode: 'Analytics', input: 'Datasets / CSV / Telemetry', output: 'Cleaned Data Profile' },
        { key: 'step_2_metric_formulation', label: '2. Metric Formulation', mode: 'Analytics', input: 'Data Profile', output: 'Target KPIs & Cohorts' },
        { key: 'step_3_statistical_analysis', label: '3. Statistical & Trend Scan', mode: 'Analytics', input: 'Target KPIs & Cohorts', output: 'Exploratory Trends' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Analytics QA Gate', mode: 'User Gate', input: 'Exploratory Trends', output: 'Approved Metric Baselines' },
        { key: 'step_5_dashboard_synthesis', label: '5. Synthesis & Visualization', mode: 'Analytics', input: 'Approved Baselines', output: 'Interactive Dashboard Spec' },
        { key: 'execution', label: '6. Deliverable Export', mode: 'Framework Phase', input: 'Interactive Spec', output: 'Final Analytics Report & Export' }
      ];
    }
    if (cat === 'deep_research') {
      return [
        { key: 'step_1_query_expansion', label: '1. Query Expansion', mode: 'Deep Research', input: 'Research Topic & Keywords', output: 'Target Domain Search Vector' },
        { key: 'step_2_grounded_crawl', label: '2. Grounded Web Crawl', mode: 'Deep Research', input: 'Search Vector', output: 'Source Corpus & Raw Abstracts' },
        { key: 'step_3_citation_verification', label: '3. Citation Verification', mode: 'Deep Research', input: 'Raw Abstracts', output: 'Verified Cross-Citations' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Research QA Gate', mode: 'User Gate', input: 'Verified Cross-Citations', output: 'Selected Source Scope' },
        { key: 'step_5_executive_synthesis', label: '5. Executive Synthesis', mode: 'Deep Research', input: 'Selected Source Scope', output: 'Structured Research Dossier' },
        { key: 'execution', label: '6. Final Briefing Delivery', mode: 'Framework Phase', input: 'Research Dossier', output: 'Grounded Briefing & Citations' }
      ];
    }
    if (cat === 'brainstorming') {
      return [
        { key: 'step_1_problem_definition', label: '1. Problem & Scope Framing', mode: 'Brainstorming', input: 'Creative Brief / Constraints', output: 'Opportunity Space Map' },
        { key: 'step_2_divergent_ideation', label: '2. Divergent Ideation', mode: 'Brainstorming', input: 'Opportunity Space Map', output: 'Raw Concept Matrix' },
        { key: 'step_3_impact_matrix', label: '3. Impact/Feasibility Ranking', mode: 'Brainstorming', input: 'Raw Concept Matrix', output: '2x2 Prioritized Quadrant' },
        { key: 'step_4_qa_user_gate', label: '🛡️ 4. Concept Gate', mode: 'User Gate', input: '2x2 Prioritized Quadrant', output: 'Chosen Winning Concept' },
        { key: 'step_5_action_plan', label: '5. Execution Blueprint', mode: 'Brainstorming', input: 'Chosen Winning Concept', output: 'Actionable Prototype Spec' },
        { key: 'execution', label: '6. Concept Launch', mode: 'Framework Phase', input: 'Actionable Spec', output: 'Final Concept Briefing & Next Steps' }
      ];
    }
    // Default standard
    return [
      { key: 'step_1_brief_analysis', label: '1. Brief Analysis', mode: 'Analytics', input: 'Task Brief & Context', output: 'Scope Boundaries' },
      { key: 'step_2_solution_research', label: '2. Solution Research', mode: 'Deep Research', input: 'Scope Boundaries', output: 'Technical Approach Options' },
      { key: 'step_3_qa_user_gate', label: '🛡️ 3. Objective Gate', mode: 'User Gate', input: 'Approach Options', output: 'Approved Execution Strategy' },
      { key: 'planning', label: '4. Planning Phase', mode: 'Framework Phase', input: 'Execution Strategy', output: 'Targeted Action Items' },
      { key: 'execution', label: '5. Active Execution', mode: 'Framework Phase', input: 'Action Items', output: 'Completed Deliverables' }
    ];
  };

  const getQaOptionsForCategory = (category: string) => {
    const cat = String(category || '').toLowerCase();
    switch (cat) {
      case 'analytics':
        return [
          "Option A: Strict Statistical Significance Thresholds (p < 0.01 & 99% CI)",
          "Option B: Standard Cohort & Conversion Trend Baselines (Default)",
          "Option C: Rapid Exploratory Summary Mode (Heuristic Data Scanning)"
        ];
      case 'deep_research':
        return [
          "Option A: Academic & ArXiv Primary Literature Focus (Peer-Reviewed Vector Scope)",
          "Option B: Industry & Technical Documentation Grounding (Default)",
          "Option C: Broad Web Intelligence & Ecosystem Scan"
        ];
      case 'brainstorming':
        return [
          "Option A: High-Impact High-Feasibility Low-Risk Roadmap Focus",
          "Option B: Moonshot & High-Risk Breakthrough Innovation Matrix",
          "Option C: Balanced Modular Feature Progression Roadmap"
        ];
      case 'system_build':
        return [
          "Option A: Multi-region active-active cluster with read replicas (Tier 1 High-Availability)",
          "Option B: Single-region failover cluster with asynchronous backup (Tier 2 Standard)",
          "Option C: Serverless scalable cold-start backend (Tier 3 Minimal Cost)"
        ];
      case 'system_build_from_data':
        return [
          "Option A: Real-Time Apache Kafka partition streaming (0.5s Latency Guarantee)",
          "Option B: Micro-Batch scheduling pipelines with Cloud Storage triggers (5m Sync Interval)",
          "Option C: On-Demand manual bulk file ingestion (Minimal Cost/Resource)"
        ];
      case 'system_optimization':
        return [
          "Option A: In-Memory Redis caching clustering (Target: <50ms read latency)",
          "Option B: Database Connection Pooling + query index optimizations (Target: <150ms latency)",
          "Option C: Serverless function concurrency warm pooling (Target: <200ms latency)"
        ];
      case 'system_optimization_from_data':
        return [
          "Option A: Parallel Live dual-write pipeline routing (Zero downtime transition)",
          "Option B: Shadow pipeline logging dry-runs (Verify correctness over 48 hours)",
          "Option C: Immediate bulk database replacement offline (Minimal complexity)"
        ];
      case 'system_test':
        return [
          "Option A: 100% Mock isolation and stubbing (Fastest local runtimes)",
          "Option B: Live Sandboxed database integration (High fidelity E2E testing)",
          "Option C: Contract/JSON schema validation only (Lightweight API validation)"
        ];
      case 'system_test_from_data':
        return [
          "Option A: 100% Production log-replay simulation (Highest load accuracy)",
          "Option B: 10% Sample transaction fuzzing (Balanced speed and coverage)",
          "Option C: Hardcoded edge-case boundary testing (Minimal test resource cost)"
        ];
      default:
        return [
          "Approve and advance to execution planning",
          "Request deeper architectural analysis iteration",
          "Flag system blockages and pause execution"
        ];
    }
  };

  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [workspaceSearchQuery, setWorkspaceSearchQuery] = useState<string>('');
  const [activeCodePath, setActiveCodePath] = useState<string>('src/server.ts');
  const [activeCodeContent, setActiveCodeContent] = useState<string | undefined>(undefined);
  const [expandedFolderPaths, setExpandedFolderPaths] = useState<Record<string, boolean>>({ 'src/': true, 'src': true });

  const router = useRouter();

  // Supabase Auth States
  const [user, setUser] = useState<any>(null);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [sandboxEmail, setSandboxEmail] = useState<string>('');
  const [sandboxPassword, setSandboxPassword] = useState<string>('');
  const [isSandboxSignUp, setIsSandboxSignUp] = useState<boolean>(false);

  // Onboarding & Plan Selection States
  const SHOW_PAYMENT_UI = true; // Payment gateway, paid subscriptions, and billing UI enabled
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<'info' | 'plan'>('info');
  const [onboardingFullName, setOnboardingFullName] = useState<string>('');
  const [onboardingUsername, setOnboardingUsername] = useState<string>('');
  const [onboardingHearAbout, setOnboardingHearAbout] = useState<string>('');
  const [onboardingCompanyName, setOnboardingCompanyName] = useState<string>('');
  const [onboardingCompanySize, setOnboardingCompanySize] = useState<string>('');
  const [onboardingCompanyRole, setOnboardingCompanyRole] = useState<string>('');
  const [onboardingUseCases, setOnboardingUseCases] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'power' | 'enterprise'>('free');

  // Forgot Password / Recovery States
  const [isForgotPassword, setIsForgotPassword] = useState<boolean>(false);
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [isRecoveryMode, setIsRecoveryMode] = useState<boolean>(false);
  const [newPassword, setNewPassword] = useState<string>('');

  // Sync recovery mode from URL
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      if (params.get('recovery') === 'true' || hash.includes('type=recovery') || hash.includes('access_token=')) {
        setIsRecoveryMode(true);
      }
    }
  }, []);

  // Sync onboarding completed state when user updates
  useEffect(() => {
    if (user) {
      const key = `fabrica_onboarding_completed_${user.id}`;
      const completed = localStorage.getItem(key) === 'true';
      setOnboardingCompleted(completed);

      // Restore saved values if onboarding is not fully complete to offer resume
      if (!completed) {
        setOnboardingFullName(localStorage.getItem(`fabrica_ob_fullname_${user.id}`) || '');
        setOnboardingUsername(localStorage.getItem(`fabrica_ob_username_${user.id}`) || '');
        setOnboardingHearAbout(localStorage.getItem(`fabrica_ob_hear_${user.id}`) || '');
        setOnboardingCompanyName(localStorage.getItem(`fabrica_ob_compname_${user.id}`) || '');
        setOnboardingCompanySize(localStorage.getItem(`fabrica_ob_compsize_${user.id}`) || '');
        setOnboardingCompanyRole(localStorage.getItem(`fabrica_ob_comprole_${user.id}`) || '');
        setOnboardingUseCases(localStorage.getItem(`fabrica_ob_usecases_${user.id}`) || '');
        const savedPlan = localStorage.getItem(`fabrica_ob_plan_${user.id}`);
        if (savedPlan === 'free' || savedPlan === 'power' || savedPlan === 'enterprise') {
          setSelectedPlan(savedPlan as any);
        }
      }
    } else {
      setOnboardingCompleted(false);
    }
  }, [user]);

  // Redirect to /oauth if not logged in or /onboard if onboarding is not completed
  // Synchronously checks localStorage to prevent double-useEffect race conditions during initial load
  useEffect(() => {
    if (!checkingAuth) {
      if (!user) {
        router.push('/oauth');
      } else {
        const key = `fabrica_onboarding_completed_${user.id}`;
        const completed = localStorage.getItem(key) === 'true';
        if (!completed) {
          router.push('/onboard');
        }
      }
    }
  }, [user, checkingAuth, router]);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      let initialUser: any = null;

      // 1. First, check local sandbox session
      const savedUser = typeof window !== 'undefined' ? localStorage.getItem('fabrica_sandbox_user') : null;
      if (savedUser) {
        try {
          initialUser = JSON.parse(savedUser);
        } catch (e) {
          console.warn('Failed parsing sandbox user:', e);
        }
      }

      // 2. Then check Supabase session (takes precedence)
      if (supabase) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            initialUser = session.user;
            const provider = session.user.app_metadata?.provider;
            if (provider === 'google') {
              setGoogleUser(session.user);
              if (session.provider_token) {
                setGoogleToken(session.provider_token);
              }
            } else if (provider === 'github') {
              if (session.provider_token) {
                setGithubToken(session.provider_token);
              }
            }
          }
        } catch (err) {
          console.warn('[auth] Error retrieving Supabase session:', err);
        }
      }

      if (active) {
        setUser(initialUser);
        setCheckingAuth(false);
      }
    };

    initializeAuth();

    let subscription: any = null;
    if (supabase) {
      try {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (!active) return;
          const currentUser = session?.user || null;
          if (currentUser) {
            setUser(currentUser);
            const provider = session?.user?.app_metadata?.provider;
            if (provider === 'google') {
              setGoogleUser(session?.user);
              if (session?.provider_token) {
                setGoogleToken(session.provider_token);
              }
            } else if (provider === 'github') {
              if (session?.provider_token) {
                setGithubToken(session.provider_token);
              }
            }
            // If logged in to real Supabase, clear the sandbox session to prevent conflicts
            localStorage.removeItem('fabrica_sandbox_user');
          } else {
            // Only clear user if they don't have a sandbox session active either
            const savedUser = typeof window !== 'undefined' ? localStorage.getItem('fabrica_sandbox_user') : null;
            if (!savedUser) {
              setUser(null);
              setGoogleUser(null);
              setGoogleToken(null);
            }
          }
          setCheckingAuth(false);
          if (event === 'SIGNED_IN' && currentUser) {
            setAuthModalOpen((wasOpen) => {
              if (wasOpen) {
                setToast({ message: 'Securely authenticated via Supabase!', type: 'success', isOpen: true });
              }
              return false;
            });
          }
        });
        subscription = data.subscription;
      } catch (err) {
        console.warn('[auth] Error establishing session listeners:', err);
      }
    }

    return () => {
      active = false;
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleOAuthSignIn = async (provider: 'google' | 'github') => {
    if (!supabase) {
      setToast({ message: 'Supabase is not configured yet.', type: 'error', isOpen: true });
      return;
    }
    try {
      let scopes = '';
      if (provider === 'google') {
        scopes = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly';
      } else if (provider === 'github') {
        scopes = 'repo read:user';
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          scopes,
          redirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setToast({ message: `OAuth login failed: ${err.message}`, type: 'error', isOpen: true });
    }
  };

  const handleSandboxLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxEmail) return;
    const mockUser = {
      email: sandboxEmail,
      id: 'usr_sandbox_' + Math.random().toString(36).substring(2, 9),
      isSandbox: true
    };
    setUser(mockUser);
    localStorage.setItem('fabrica_sandbox_user', JSON.stringify(mockUser));
    setToast({ message: `Successfully authenticated sandbox session as ${sandboxEmail}!`, type: 'success', isOpen: true });
  };

  const handleSignOut = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
    localStorage.removeItem('fabrica_sandbox_user');
    setUser(null);
    setToast({ message: 'Signed out successfully.', type: 'info', isOpen: true });
    window.location.reload();
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    try {
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
          redirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard?recovery=true' : undefined,
        });
        if (error) {
          setToast({ message: error.message, type: 'error', isOpen: true });
        } else {
          setToast({ message: 'Password recovery email sent! Check your inbox.', type: 'success', isOpen: true });
          setIsForgotPassword(false);
        }
      } else {
        setToast({ message: `[Sandbox] Mock recovery email sent to ${forgotEmail}.`, type: 'success', isOpen: true });
        setIsForgotPassword(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'An error occurred', type: 'error', isOpen: true });
    }
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) return;
    try {
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setToast({ message: error.message, type: 'error', isOpen: true });
        } else {
          setToast({ message: 'Password reset successful! You are now logged in.', type: 'success', isOpen: true });
          setIsRecoveryMode(false);
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            setUser(session.user);
          }
        }
      } else {
        setToast({ message: '[Sandbox] Password updated successfully in mock sandbox!', type: 'success', isOpen: true });
        setIsRecoveryMode(false);
      }
    } catch (err: any) {
      setToast({ message: err.message || 'An error occurred', type: 'error', isOpen: true });
    }
  };

  // Active workspace state
  const [activeEntity, setActiveEntity] = useState<string>(() => getActiveTenantId());
  const [entityData, setEntityData] = useState<EntityData | null>(null);

  useEffect(() => {
    if (user?.id) {
      setActiveEntity(user.id);
      if (typeof window !== 'undefined') {
        localStorage.setItem('fabrica_active_entity', user.id);
        localStorage.setItem('fabrica_user_id', user.id);
      }
    } else {
      const active = getActiveTenantId();
      if (active) setActiveEntity(active);
    }
  }, [user?.id]);
  const [ecosystem, setEcosystem] = useState<EcosystemData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Sizing and layout states matching the 3-column architecture
  const [minCenter, setMinCenter] = useState<boolean>(false);
  const [minBottomVertical, setMinBottomVertical] = useState<boolean>(false);
  const [minPreviewState, setMinPreviewState] = useState<boolean>(false);
  const [minEditorState, setMinEditorState] = useState<boolean>(false);
  const [minSide, setMinSide] = useState<boolean>(false);
  const [minTop, setMinTop] = useState<boolean>(false);
  const [leftSideW, setLeftSideW] = useState<number>(31);
  const [sideW, setSideW] = useState<number>(27);
  const [isDraggingLeftRail, setIsDraggingLeftRail] = useState<boolean>(false);
  const [isDraggingRightRail, setIsDraggingRightRail] = useState<boolean>(false);
  const [heroCollapsed, setHeroCollapsed] = useState<boolean>(false);

  // Tabs states
  const [mobileTab, setMobileTab] = useState<'center' | 'left' | 'right'>('center');
  const [leftTab, setLeftTab] = useState<'agent' | 'context' | 'cache'>('agent');
  const [showCommandsMenu, setShowCommandsMenu] = useState<boolean>(false);
  const [commandsMenuCoords, setCommandsMenuCoords] = useState<{ bottom: number; left: number }>({ bottom: 75, left: 260 });
  const commandsBtnRef = useRef<HTMLButtonElement>(null);
  const [commandSearch, setCommandSearch] = useState<string>('');

  const toggleCommandsMenu = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!showCommandsMenu && commandsBtnRef.current) {
      const rect = commandsBtnRef.current.getBoundingClientRect();
      setCommandsMenuCoords({
        bottom: Math.max(50, window.innerHeight - rect.top + 8),
        left: Math.max(10, Math.min(rect.left, window.innerWidth - 305))
      });
    }
    setShowCommandsMenu(!showCommandsMenu);
  };
  const [agentsMdContent, setAgentsMdContent] = useState<string>('');
  const [agentsMdPath, setAgentsMdPath] = useState<string>('');
  const [isLoadingAgentsMd, setIsLoadingAgentsMd] = useState<boolean>(false);
  const [isSavingAgentsMd, setIsSavingAgentsMd] = useState<boolean>(false);
  const [agentsMdMode, setAgentsMdMode] = useState<'edit' | 'preview'>('edit');
  const [centerMode, setCenterMode] = useState<'board' | 'graph'>('board');
  const [rightView, setRightView] = useState<'inbox' | 'toolboxes'>('inbox');
  const [yourDataSystemsView, setYourDataSystemsView] = useState<'list' | 'graph'>('list');

  const handleMobileTabSelect = (tab: 'center' | 'left' | 'right') => {
    setMobileTab(tab);
    if (tab === 'center') setMinCenter(false);
    if (tab === 'right') setMinSide(false);
  };

  // Google Workspace & GitHub integration states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isFetchingDrive, setIsFetchingDrive] = useState<boolean>(false);
  const [selectedDriveFile, setSelectedDriveFile] = useState<any>(null);
  const [isImportingDriveFile, setIsImportingDriveFile] = useState<boolean>(false);
  const [googleWorkspaceOpen, setGoogleWorkspaceOpen] = useState<boolean>(false);

  const [gitHubOpen, setGitHubOpen] = useState<boolean>(false);
  const [githubOwner, setGithubOwner] = useState<string>('');
  const [githubRepo, setGithubRepo] = useState<string>('');
  const [githubBranch, setGithubBranch] = useState<string>('main');
  const [githubPath, setGithubPath] = useState<string>('');
  const [githubToken, setGithubToken] = useState<string>('');
  const [githubFiles, setGithubFiles] = useState<any[]>([]);
  const [isFetchingGithub, setIsFetchingGithub] = useState<boolean>(false);
  const [selectedGithubFile, setSelectedGithubFile] = useState<any>(null);
  const [githubExportTargetId, setGithubExportTargetId] = useState<string>('');
  const [githubExportPath, setGithubExportPath] = useState<string>('');
  const [githubExportCommit, setGithubExportCommit] = useState<string>('Export system component from Fabrica');
  const [isExportingGithub, setIsExportingGithub] = useState<boolean>(false);

  // Pop-up dialog states for Import and Export integrations
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [selectedImportMethod, setSelectedImportMethod] = useState<'local' | 'google' | 'github'>('local');
  const [selectedExportMethod, setSelectedExportMethod] = useState<'google' | 'github'>('github');

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [semanticSearchQuery, setSemanticSearchQuery] = useState<string>('');
  const [semanticSearchResults, setSemanticSearchResults] = useState<any[] | null>(null);
  const [isSearchingSemantic, setIsSearchingSemantic] = useState<boolean>(false);
  const [sysSemanticSearchQuery, setSysSemanticSearchQuery] = useState<string>('');
  const [sysSemanticSearchResults, setSysSemanticSearchResults] = useState<any[] | null>(null);
  const [isSearchingSysSemantic, setIsSearchingSysSemantic] = useState<boolean>(false);
  const [prioFilter, setPrioFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL'); // ALL, DRAFT, PLANNING, EXECUTION, DONE
  const [typeFilter, setTypeFilter] = useState<string>('ALL'); // ALL, standard, brainstorming, deep_research, analytics, system_build, system_build_from_data, system_optimization, system_optimization_from_data, system_test, system_test_from_data
  const [sortOption, setSortOption] = useState<string>('default'); // default, name, priority

  // Sources and Deliverables sub-section filter and selection states
  const [sourceSubSectionFilter, setSourceSubSectionFilter] = useState<string>('all');
  const [deliverableSubSectionFilter, setDeliverableSubSectionFilter] = useState<string>('all');
  const [newSourceSubSection, setNewSourceSubSection] = useState<string>('discovery_scoping');
  const [newDeliverableSubSection, setNewDeliverableSubSection] = useState<string>('executions');
  const [exportSelectedSourceIds, setExportSelectedSourceIds] = useState<string[]>([]);
  const [exportSelectedDeliverableIds, setExportSelectedDeliverableIds] = useState<string[]>([]);
  const [modalSubSectionContext, setModalSubSectionContext] = useState<{
    sectionType: 'sources' | 'deliverables';
    subSectionKey: string;
    subSectionLabel: string;
    secItems: any[];
  } | null>(null);

  // Add & Edit Modals states for Sources & Deliverables
  const [isAddSourceModalOpen, setIsAddSourceModalOpen] = useState<boolean>(false);
  const [isAddDeliverableModalOpen, setIsAddDeliverableModalOpen] = useState<boolean>(false);
  const [newSourceTitle, setNewSourceTitle] = useState<string>('');
  const [newSourceContent, setNewSourceContent] = useState<string>('');
  const [newDeliverableTitle, setNewDeliverableTitle] = useState<string>('');
  const [newDeliverableRole, setNewDeliverableRole] = useState<string>('');
  const [newDeliverableCode, setNewDeliverableCode] = useState<string>('');
  const [editingSourceItem, setEditingSourceItem] = useState<any | null>(null);
  const [editingDeliverableItem, setEditingDeliverableItem] = useState<any | null>(null);
  const [editSourceSubSection, setEditSourceSubSection] = useState<string>('discovery_scoping');
  const [editDeliverableSubSection, setEditDeliverableSubSection] = useState<string>('executions');

  // AI Agent Missions Pipeline - Approval Gates, EFFORT Parameters & Execution Logs
  const [isGatesModalOpen, setIsGatesModalOpen] = useState<boolean>(false);
  const [isEffortModalOpen, setIsEffortModalOpen] = useState<boolean>(false);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState<boolean>(false);
  const [selectedMissionLogs, setSelectedMissionLogs] = useState<{ missionId: string; logs: string[] } | null>(null);

  // Phase Filters for each section (Drafting to Delivery)
  const [draftingPhaseFilter, setDraftingPhaseFilter] = useState<string>('ALL');
  const [planningPhaseFilter, setPlanningPhaseFilter] = useState<string>('ALL');
  const [executionPhaseFilter, setExecutionPhaseFilter] = useState<string>('ALL');
  const [deliveryPhaseFilter, setDeliveryPhaseFilter] = useState<string>('ALL');

  // Approval Gates toggles across loops and non-loops
  const [approvalGates, setApprovalGates] = useState<Record<string, boolean>>({
    'discovery_scoping': true,
    'deep_research': true,
    'data_analysis': false,
    'strategic_synthesis': true,
    'generation': false,
    'verification': true,
    'review': true
  });

  // EFFORT Parameters for loops only
  const [loopEfforts, setLoopEfforts] = useState<Record<string, 'Low' | 'Medium' | 'High' | 'Deep'>>({
    'discovery_scoping': 'Medium',
    'deep_research': 'High',
    'execution_loop': 'Medium'
  });

  // Launcher mission type selector
  const [launcherModelType, setLauncherModelType] = useState<'standard' | 'full_pipeline' | 'quick_pipeline' | 'custom_entry_pipeline' | 'custom_selection_pipeline'>('full_pipeline');
  const [quickStartPhase, setQuickStartPhase] = useState<string>('execution');
  const [customEntryPhase, setCustomEntryPhase] = useState<string>('planning');
  const [selectedPipelinePhases, setSelectedPipelinePhases] = useState<Record<string, boolean>>({
    'discovery_scoping': true,
    'deep_research': true,
    'data_analysis': true,
    'strategic_synthesis': true,
    'generation': true,
    'verification': true,
    'review': true
  });

  // Loop / Stage Dependency Engine State: Tracks processed items per stage/loop to prevent redundant re-processing and force continuous evolution
  const [processedStageItems, setProcessedStageItems] = useState<Record<string, string[]>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('fabrica_stage_dependency_processed_items');
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      discovery_scoping: [],
      deep_research: [],
      data_analysis: [],
      strategic_synthesis: [],
      execution: [],
      verification: [],
      review: []
    };
  });

  const [forceContinuousEvolution, setForceContinuousEvolution] = useState<boolean>(true);
  const [isDependencyEngineModalOpen, setIsDependencyEngineModalOpen] = useState<boolean>(false);
  const [dependencyEngineActiveTab, setDependencyEngineActiveTab] = useState<'matrix' | 'graph' | 'settings'>('matrix');
  const [dependencyEngineSearch, setDependencyEngineSearch] = useState<string>('');
  const [selectedStageForContextBinding, setSelectedStageForContextBinding] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('fabrica_stage_dependency_processed_items', JSON.stringify(processedStageItems));
    }
  }, [processedStageItems]);

  const toggleItemProcessedForStage = (itemId: string, stageKey: string) => {
    setProcessedStageItems(prev => {
      const currentList = prev[stageKey] || [];
      const exists = currentList.includes(itemId);
      const nextList = exists ? currentList.filter(id => id !== itemId) : [...currentList, itemId];
      return { ...prev, [stageKey]: nextList };
    });
  };

  const isItemProcessedInStage = (itemId: string, stageKey?: string): boolean => {
    if (stageKey) {
      return (processedStageItems[stageKey] || []).includes(itemId);
    }
    return Object.values(processedStageItems).some(list => list.includes(itemId));
  };

  const getStagesWhereItemProcessed = (itemId: string): string[] => {
    const stages: string[] = [];
    Object.entries(processedStageItems).forEach(([stg, ids]) => {
      if (ids.includes(itemId)) stages.push(stg);
    });
    return stages;
  };

  const resetStageProcessedMemory = (stageKey?: string) => {
    if (stageKey) {
      setProcessedStageItems(prev => ({ ...prev, [stageKey]: [] }));
      setToast({ message: `Reset processed item memory for stage "${stageKey}"`, type: 'info', isOpen: true });
    } else {
      setProcessedStageItems({
        discovery_scoping: [],
        deep_research: [],
        data_analysis: [],
        strategic_synthesis: [],
        execution: [],
        verification: [],
        review: []
      });
      setToast({ message: 'Cleared processed item memory across all pipeline loops & stages', type: 'info', isOpen: true });
    }
  };

  const markAllSubSecItemsProcessed = (secItems: any[], stageKey: string, processed: boolean) => {
    const itemIds = secItems.map(i => i.id);
    setProcessedStageItems(prev => {
      const current = prev[stageKey] || [];
      let next: string[];
      if (processed) {
        next = Array.from(new Set([...current, ...itemIds]));
      } else {
        next = current.filter(id => !itemIds.includes(id));
      }
      return { ...prev, [stageKey]: next };
    });
  };

  // Markdown board states
  const [boardContent, setBoardContent] = useState<string>('');
  const [isEditingBoard, setIsEditingBoard] = useState<boolean>(false);
  const [isSavingBoard, setIsSavingBoard] = useState<boolean>(false);

  // Discovery upload states
  const [uploadStatus, setUploadStatus] = useState<string>('idle');
  const [uploadProgress, setUploadProgress] = useState<string>('');

  // System upload states
  const [systemUploadStatus, setSystemUploadStatus] = useState<string>('idle');
  const [systemUploadProgress, setSystemUploadProgress] = useState<string>('');

  // Tenant Setup & First-Time Initialization States
  const [isTenantSetupInitializing, setIsTenantSetupInitializing] = useState<boolean>(false);
  const [tenantSetupProgress, setTenantSetupProgress] = useState<number>(0);
  const [tenantSetupStep, setTenantSetupStep] = useState<string>('Initializing user directory...');
  const [tenantSetupError, setTenantSetupError] = useState<string | null>(null);
  const [agentStartError, setAgentStartError] = useState<string | null>(null);

  // Draggable Floating Agent States
  const [agentWindowOpen, setAgentWindowOpen] = useState<boolean>(false);
  const [agentWinTab, setAgentWinTab] = useState<'agent' | 'review' | 'backlog' | 'account' | 'logs' | 'realtime'>('agent');

  // AI Capabilities: Web Search Grounding, Deep Research, Streaming
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [isStreamingEnabled, setIsStreamingEnabled] = useState<boolean>(true);
  
  const [deepQuery, setDeepQuery] = useState<string>('');
  const [deepReport, setDeepReport] = useState<string>('');
  const [deepSteps, setDeepSteps] = useState<string[]>([]);
  const [deepSources, setDeepSources] = useState<string[]>([]);
  const [isDeepResearching, setIsDeepResearching] = useState<boolean>(false);
  const [isAccountHoverOpen, setIsAccountHoverOpen] = useState<boolean>(false);
  const [accountHoverPos, setAccountHoverPos] = useState<{ top: number; right: number }>({ top: 38, right: 10 });
  const [agentBtnWin, setAgentBtnWin] = useState({ x: 20, y: 550 });
  const [agentWin, setAgentWin] = useState({ x: 100, y: 150, w: 380, h: 480 });
  const [customApiKey, setCustomApiKey] = useState<string>('');
  const [geminiApiKey, setGeminiApiKey] = useState<string>('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState<string>('');
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>('');
  const [backendKeys, setBackendKeys] = useState<{ gemini: boolean; openrouter: boolean; anthropic: boolean }>({ gemini: false, openrouter: false, anthropic: false });
  const [chatModel, setChatModel] = useState<string>('gemini-3.6-flash');
  const [tokenBillingMode, setTokenBillingMode] = useState<'managed' | 'paug' | 'byok' | 'pool'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('fabrica_llm_method');
      if (saved === 'pool' || saved === 'byok' || saved === 'managed' || saved === 'paug') {
        return saved;
      }
    }
    return 'pool';
  });
  const [piModelsList, setPiModelsList] = useState<any[]>(DEFAULT_PI_CLI_MODELS);

  const handleTokenBillingModeChange = (mode: 'managed' | 'paug' | 'byok' | 'pool') => {
    setTokenBillingMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fabrica_llm_method', mode);
    }
    if (mode === 'pool') {
      if (!FABRICA_POOL_MODELS.some(m => m.id === chatModel)) {
        setChatModel('gemini-3.6-flash');
      }
    }
  };
  const [fetchedModels, setFetchedModels] = useState<{
    gemini: any[];
    openrouter: any[];
    anthropic: any[];
  }>({ gemini: [], openrouter: [], anthropic: [] });
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);
  const [fetchModelsError, setFetchModelsError] = useState<string>('');

  const [showOnlyFree, setShowOnlyFree] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pboot_show_only_free') === 'true';
    }
    return false;
  });

  // Custom alert/confirmation modal and toast notification states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
  } | null>(null);

  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
    isOpen: boolean;
  } | null>(null);

  useEffect(() => {
    if (toast && toast.isOpen) {
      const timer = setTimeout(() => {
        setToast(prev => prev ? { ...prev, isOpen: false } : null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);



  // Keys draft and save statuses
  const [geminiKeyStatus, setGeminiKeyStatus] = useState<'draft' | 'saving' | 'saved' | 'none'>('none');
  const [openrouterKeyStatus, setOpenrouterKeyStatus] = useState<'draft' | 'saving' | 'saved' | 'none'>('none');
  const [anthropicKeyStatus, setAnthropicKeyStatus] = useState<'draft' | 'saving' | 'saved' | 'none'>('none');
  const [customApiKeyStatus, setCustomApiKeyStatus] = useState<'draft' | 'saving' | 'saved' | 'none'>('none');

  const originalGeminiKey = useRef<string>('');
  const originalOpenrouterKey = useRef<string>('');
  const originalAnthropicKey = useRef<string>('');
  const originalCustomApiKey = useRef<string>('');

  const renderStatusBadge = (status: 'draft' | 'saving' | 'saved' | 'none') => {
    if (status === 'none') return null;
    const colors = {
      draft: { bg: 'rgba(245, 158, 11, 0.12)', text: 'var(--status-warn)', label: 'DRAFT' },
      saving: { bg: 'rgba(59, 130, 246, 0.12)', text: '#3b82f6', label: 'SAVING...' },
      saved: { bg: 'rgba(16, 185, 129, 0.12)', text: 'var(--status-success)', label: 'SAVED ✓' }
    };
    const config = colors[status];
    return (
      <span style={{
        fontSize: '7px',
        fontWeight: 900,
        padding: '1.5px 4px',
        borderRadius: '3px',
        backgroundColor: config.bg,
        color: config.text,
        fontFamily: 'var(--mono)',
        marginLeft: '6px',
        display: 'inline-block',
        verticalAlign: 'middle',
        letterSpacing: '0.03em',
        animation: status === 'saving' ? 'pulse 1s infinite alternate' : 'none'
      }}>
        {config.label}
      </span>
    );
  };

  const handleGeminiKeyChange = (val: string) => {
    setGeminiApiKey(val);
    if (val !== originalGeminiKey.current) {
      setGeminiKeyStatus('draft');
    } else {
      setGeminiKeyStatus('none');
    }
  };

  const handleOpenrouterKeyChange = (val: string) => {
    setOpenrouterApiKey(val);
    if (val !== originalOpenrouterKey.current) {
      setOpenrouterKeyStatus('draft');
    } else {
      setOpenrouterKeyStatus('none');
    }
  };

  const handleAnthropicKeyChange = (val: string) => {
    setAnthropicApiKey(val);
    if (val !== originalAnthropicKey.current) {
      setAnthropicKeyStatus('draft');
    } else {
      setAnthropicKeyStatus('none');
    }
  };

  const handleCustomApiKeyChange = (val: string) => {
    setCustomApiKey(val);
    if (val !== originalCustomApiKey.current) {
      setCustomApiKeyStatus('draft');
    } else {
      setCustomApiKeyStatus('none');
    }
  };
  const [autoFreeFallback, setAutoFreeFallback] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pboot_auto_free_fallback') === 'true';
    }
    return false;
  });

  // Backlog & Review News Banner/Ticker custom states
  const [isBacklogEditorOpen, setIsBacklogEditorOpen] = useState<boolean>(false);

  // BacklogItem: agent writes 'suggested', user interactions produce 'validated'
  type BacklogItem = { id: string; text: string; type: 'suggested' | 'validated'; created_at: string };
  const mkBacklogItem = (text: string, type: 'suggested' | 'validated' = 'validated'): BacklogItem => ({
    id: `bl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    text, type, created_at: new Date().toISOString()
  });
  const normalizeBacklog = (raw: any[]): BacklogItem[] =>
    raw.map(item => typeof item === 'string'
      ? mkBacklogItem(item, 'validated')
      : { id: item.id || `bl_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, text: item.text || String(item), type: item.type || 'validated', created_at: item.created_at || new Date().toISOString() });

  const [editedBacklog, setEditedBacklog] = useState<BacklogItem[]>([]);
  const [newBacklogItemText, setNewBacklogItemText] = useState<string>('');
  const [activeReviewItem, setActiveReviewItem] = useState<any | null>(null);
  const [reviewFeedbackText, setReviewFeedbackText] = useState<string>('');
  const [reviewCustomEntryLoop, setReviewCustomEntryLoop] = useState<string>('execution');
  const [isSavingBacklog, setIsSavingBacklog] = useState<boolean>(false);

  // New states for interactive backlog item detail & review editor
  const [activeBacklogItem, setActiveBacklogItem] = useState<any | null>(null);
  const [backlogFeedbackText, setBacklogFeedbackText] = useState<string>('');
  const [isReviewEditorOpen, setIsReviewEditorOpen] = useState<boolean>(false);
  const [editedReviewQueue, setEditedReviewQueue] = useState<any[]>([]);
  const [newReviewItemText, setNewReviewItemText] = useState<string>('');
  const [isSavingReview, setIsSavingReview] = useState<boolean>(false);

  // Post-turn automation for Backlog and Review Queue (mocks removed)
  const runPostTurnAutomations = async (updatedBacklogList?: string[], updatedReviewList?: any[]) => {
    const currentBacklog = updatedBacklogList !== undefined ? updatedBacklogList : (runtime?.backlog || []);
    const currentReviews = updatedReviewList !== undefined ? updatedReviewList : (runtime?.review_queue || []);

    let backlogUpdated = false;
    let reviewUpdated = false;

    if (updatedBacklogList !== undefined) {
      backlogUpdated = true;
    }
    if (updatedReviewList !== undefined) {
      reviewUpdated = true;
    }

    if (backlogUpdated) {
      await api.patchEntity(activeEntity, 'runtime', ['backlog'], currentBacklog);
      await harnessApi.updateHarnessState({ backlog: currentBacklog, backlogs: currentBacklog }).catch(() => {});
    }
    if (reviewUpdated) {
      await api.patchEntity(activeEntity, 'runtime', ['review_queue'], currentReviews);
      await harnessApi.updateHarnessState({ review: currentReviews, review_queues: currentReviews }).catch(() => {});
    }
    await fetchWorkspaceData();
  };

  const processReviewResponse = async (item: any, responseText: string, entryLoop: string = 'execution') => {
    const itemLabel = typeof item === 'string' ? item : (item.label || item.name || 'Component');
    
    const loopLabelMap: Record<string, string> = {
      execution: 'Execution Loop (Default - Execution Generation & Verification)',
      drafting: 'Drafting Loop (Discovery & Scoping)',
      planning: 'Planning Loop (Strategic Synthesis & Decision Support)',
      custom: 'Custom Entry Loop'
    };
    const targetLoopName = loopLabelMap[entryLoop] || 'Execution Loop (Default)';

    // 1. Post a user message in the chat
    const userMsg = `🎯 [Review Response for "${itemLabel}"]: ${responseText}\n📍 Re-entry Loop Target: ${targetLoopName}\n📦 Work Location: Moved to Deliverables/Executions`;
    const updatedHistory = [...chatHistory, { sender: 'user' as const, text: userMsg }];
    setChatHistory(updatedHistory);
    setIsChatLoading(true);
    setMinLeftSide(false);
    setActiveReviewItem(null);

    // 2. Set the review item status to 'responded', record custom entry loop, and relocate work to Deliverables/Executions
    const nextQueue = (runtime?.review_queue || []).map((q: any) => {
      const qLabel = typeof q === 'string' ? q : (q.label || q.name || '');
      if (qLabel === itemLabel) {
        return {
          ...(typeof q === 'string' ? { label: q } : q),
          userResponse: responseText,
          reentryLoop: entryLoop,
          location: 'Deliverables/Executions',
          status: 'responded'
        };
      }
      return q;
    });

    try {
      await api.patchEntity(activeEntity, 'runtime', ['review_queue'], nextQueue);
      
      // 3. Request model response to process the feedback
      const formattedHistory = updatedHistory.map(h => ({
        sender: h.sender === 'user' ? 'user' : 'model',
        text: h.text
      }));

      const prompt = `The user provided review feedback on "${itemLabel}": "${responseText}".
Re-entry Loop Target: ${targetLoopName}.
Work status update: Work item relocated to Deliverables/Executions.
Please immediately process this feedback starting from ${targetLoopName}, acknowledge the critique, and re-run the full pipeline loop from that entry point based on this feedback.`;
      
      const res = await api.chatAgent(prompt, formattedHistory, customApiKey, chatModel);
      if (res.ok) {
        setChatHistory(prev => [...prev, { sender: 'agent', text: res.text }]);
        const lowerText = (res.text || '').toLowerCase();
        if (
          lowerText.includes('no key') ||
          lowerText.includes('api key') ||
          lowerText.includes('offline preview mode') ||
          lowerText.includes('please supply') ||
          lowerText.includes('not configured')
        ) {
          setIsAccountWindowOpen(true);
        }
      } else {
        setChatHistory(prev => [...prev, { sender: 'agent', text: `Processed Review Queue feedback: "${responseText}" for "${itemLabel}". Loop re-entry (${targetLoopName}) registered & work relocated to Deliverables/Executions.` }]);
        setIsAccountWindowOpen(true);
      }
      
      await fetchWorkspaceData();
    } catch (err: any) {
      console.error(err);
      setChatHistory(prev => [...prev, { sender: 'agent', text: `Failed to process response: ${err.message || 'Offline merge completed.'}` }]);
      setIsAccountWindowOpen(true);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSaveBacklog = async (updatedList: BacklogItem[]) => {
    setIsSavingBacklog(true);
    let listToSave = [...updatedList];
    let showAutoMsg = false;
    if (listToSave.length === 0) {
      listToSave = [
        "Synthesize customer chat transcripts (csv) to align with Gemini recommendation templates.",
        "Conduct automated Meta/Google conversion rate telemetry checks for campaign budget rationalization.",
        "Review SMTP transaction throughput to optimize cart-abandonment trigger reliability.",
        "Validate product catalog pricing margins against regional multi-channel logs."
      ].map(t => mkBacklogItem(t, 'validated'));
      showAutoMsg = true;
    }
    try {
      await api.patchEntity(activeEntity, 'runtime', ['backlog'], listToSave);
      await harnessApi.updateHarnessState({ backlog: listToSave, backlogs: listToSave }).catch(() => {});
      await fetchWorkspaceData();
      setToast({
        message: showAutoMsg ? 'Strategic backlog cleared! Auto-generated agent vision goals.' : 'Strategic backlog updated successfully!',
        type: 'success',
        isOpen: true
      });
      setIsBacklogEditorOpen(false);
    } catch (err: any) {
      console.error(err);
      setToast({
        message: err.message || 'Failed to update backlog.',
        type: 'error',
        isOpen: true
      });
    } finally {
      setIsSavingBacklog(false);
    }
  };

  const handleArchiveBacklogItem = async (itemToRemove: string) => {
    const nextBacklog = (runtime?.backlog || []).filter((item: any) => item !== itemToRemove);
    setIsSavingBacklog(true);
    try {
      await api.patchEntity(activeEntity, 'runtime', ['backlog'], nextBacklog);
      await harnessApi.updateHarnessState({ backlog: nextBacklog, backlogs: nextBacklog }).catch(() => {});
      await fetchWorkspaceData();
      setToast({
        message: 'Successfully removed from strategic backlog!',
        type: 'success',
        isOpen: true
      });
      setActiveBacklogItem(null);
    } catch (err: any) {
      console.error(err);
      setToast({
        message: err.message || 'Failed to remove backlog item.',
        type: 'error',
        isOpen: true
      });
    } finally {
      setIsSavingBacklog(false);
    }
  };

  const handleSaveReviewQueue = async (updatedList: any[]) => {
    setIsSavingReview(true);
    try {
      await api.patchEntity(activeEntity, 'runtime', ['review_queue'], updatedList);
      await harnessApi.updateHarnessState({ review: updatedList, review_queues: updatedList }).catch(() => {});
      await fetchWorkspaceData();
      setToast({
        message: 'Review queue updated successfully!',
        type: 'success',
        isOpen: true
      });
      setIsReviewEditorOpen(false);
    } catch (err: any) {
      console.error(err);
      setToast({
        message: err.message || 'Failed to update review queue.',
        type: 'error',
        isOpen: true
      });
    } finally {
      setIsSavingReview(false);
    }
  };

  const handleArchiveReviewItem = async (itemToArchive: string) => {
    try {
      const nextQueue = (runtime?.review_queue || []).filter((item: any) => item !== itemToArchive);
      await api.patchEntity(activeEntity, 'runtime', ['review_queue'], nextQueue);
      await fetchWorkspaceData();
      setToast({
        message: 'Review item approved & resolved!',
        type: 'success',
        isOpen: true
      });
      setActiveReviewItem(null);
    } catch (err: any) {
      console.error(err);
      setToast({
        message: err.message || 'Failed to archive review item.',
        type: 'error',
        isOpen: true
      });
    }
  };

  const triggerReviewAudit = (itemLabel: string) => {
    setChatMessage(`Please audit and review this built artifact: "${itemLabel}". What is the status of its implementation?`);
    setMinLeftSide(false);
    setActiveReviewItem(null);
  };

  const isModelPaid = (modelId: string): boolean => {
    if (!modelId) return false;
    if (modelId.startsWith('anthropic/') || modelId.startsWith('claude-')) {
      return true;
    }
    if (modelId.startsWith('openrouter/')) {
      // Find in fetched models first
      const found = fetchedModels.openrouter?.find((m: any) => m.id === modelId);
      if (found) {
        return !found.isFree;
      }
      // Or check if it ends with ':free'
      return !modelId.endsWith(':free');
    }
    // Gemini models from AI Studio are free tier keys (which are completely free of charge to use)
    return false;
  };

  const getFirstFreeModel = (): string | null => {
    const isGeminiConfigured = !!geminiApiKey || backendKeys.gemini;
    if (isGeminiConfigured) {
      if (fetchedModels.gemini && fetchedModels.gemini.length > 0) {
        const found = fetchedModels.gemini.find(m => !isModelPaid(m.id));
        if (found) return found.id;
      }
      return 'gemini-3.6-flash';
    }
    const isOpenRouterConfigured = !!openrouterApiKey || backendKeys.openrouter;
    if (isOpenRouterConfigured) {
      if (fetchedModels.openrouter && fetchedModels.openrouter.length > 0) {
        const found = fetchedModels.openrouter.find(m => !isModelPaid(m.id));
        if (found) return found.id;
      }
      return 'openrouter/meta-llama/llama-3.3-70b-instruct:free';
    }
    return null;
  };

  useEffect(() => {
    localStorage.setItem('pboot_show_only_free', String(showOnlyFree));
  }, [showOnlyFree]);

  useEffect(() => {
    localStorage.setItem('pboot_auto_free_fallback', String(autoFreeFallback));
  }, [autoFreeFallback]);

  useEffect(() => {
    if (showOnlyFree && chatModel) {
      if (isModelPaid(chatModel)) {
        const fallback = getFirstFreeModel();
        if (fallback) {
          handleModelChange(fallback);
        }
      }
    }
  }, [showOnlyFree, fetchedModels, geminiApiKey, openrouterApiKey, backendKeys]);

  useEffect(() => {
    if (autoFreeFallback && chatModel) {
      if (isModelPaid(chatModel)) {
        const fallback = getFirstFreeModel();
        if (fallback && fallback !== chatModel) {
          handleModelChange(fallback);
        }
      }
    }
  }, [autoFreeFallback, chatModel, fetchedModels, geminiApiKey, openrouterApiKey, backendKeys]);

  useEffect(() => {
    api.getPiModels().then((res) => {
      if (res && res.ok && Array.isArray(res.models) && res.models.length > 0) {
        setPiModelsList(res.models);
      }
    }).catch(() => {});
  }, []);

  const loadRealModels = async (
    gKey: string = geminiApiKey,
    oKey: string = openrouterApiKey,
    aKey: string = anthropicApiKey,
    oaiKey: string = '',
    grKey: string = '',
    dsKey: string = ''
  ) => {
    setIsFetchingModels(true);
    setFetchModelsError('');
    try {
      const res = await api.getModels(gKey, oKey, aKey, oaiKey, grKey, dsKey);
      let piModelsRes: any = null;
      try {
        piModelsRes = await api.getPiModels();
        if (piModelsRes && piModelsRes.ok && Array.isArray(piModelsRes.models) && piModelsRes.models.length > 0) {
          setPiModelsList(piModelsRes.models);
        }
      } catch (e) {}

      if (res.ok && res.providers) {
        const mergedProviders: any = { ...res.providers };
        if (piModelsRes && piModelsRes.ok && Array.isArray(piModelsRes.models)) {
          for (const piM of piModelsRes.models) {
            const providerKey = piM.provider || 'gemini';
            if (!mergedProviders[providerKey]) {
              mergedProviders[providerKey] = [];
            }
            if (!mergedProviders[providerKey].some((m: any) => m.id === piM.id)) {
              mergedProviders[providerKey].unshift(piM);
            }
          }
        }
        setFetchedModels(mergedProviders);
      } else {
        setFetchModelsError('Failed to fetch models from server');
      }
    } catch (err: any) {
      console.error("Error loading real models:", err);
      setFetchModelsError(err.message || 'Network error');
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Agent Chat states & PI session management
  interface ChatSession {
    id: string;
    name: string;
    history: { sender: 'user' | 'agent'; text: string }[];
  }

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  const [showSessionDropdown, setShowSessionDropdown] = useState<boolean>(false);
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<{ sender: 'user' | 'agent'; text: string }[]>([]);
  const [agentSuggestions, setAgentSuggestions] = useState<string[]>([]);
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);
  const [isAgentInitialized, setIsAgentInitialized] = useState<boolean>(false);
  const [isStartingAgent, setIsStartingAgent] = useState<boolean>(false);

  const handleStartAgent = async () => {
    const tenantKey = user?.id || activeEntity || 'default_user';
    setIsStartingAgent(true);
    try {
      const res = await api.startAgent(tenantKey);
      if (res && res.ok && res.agentInitialized) {
        setIsAgentInitialized(true);
        setToast({ message: 'User Container & Agent Runner booted and initialized successfully!', type: 'success', isOpen: true });
      } else {
        setIsAgentInitialized(false);
        setToast({ message: res?.error || res?.message || 'Container agent initialization failed. .pi/ workspace not found.', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      console.error('Failed to start agent:', err);
      setIsAgentInitialized(false);
      setToast({ message: 'Error triggering User Container & Agent Server.', type: 'error', isOpen: true });
    } finally {
      setIsStartingAgent(false);
    }
  };

  const [piContext, setPiContext] = useState<{ tokensUsed: number; maxTokens: number; percentUsed: number; messageCount: number } | null>(null);
  const [contextPickerAttachedItems, setContextPickerAttachedItems] = useState<AttachedContextItem[]>([]);
  const [isContextPickerOpen, setIsContextPickerOpen] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const lastSendTimeRef = useRef<number>(0);

  const refreshPiSessions = async (tenantKey: string, targetActiveId?: string) => {
    try {
      const res = await api.getPiSessions(tenantKey);
      if (res && res.ok && Array.isArray(res.sessions)) {
        if (res.sessions.length === 0) {
          const created = await api.createPiSession(tenantKey, 'Session 1');
          if (created && created.ok && created.session) {
            const formatted = [{
              id: created.session.id,
              name: created.session.name || 'Session 1',
              history: created.session.history || []
            }];
            setSessions(formatted);
            setActiveSessionId(created.session.id);
            setChatHistory(created.session.history || []);
            refreshPiContext(tenantKey, created.session.id);
            return;
          }
        }

        const formatted = res.sessions.map((s: any) => ({
          id: s.id,
          name: s.name || `Session (${s.id.slice(-6)})`,
          history: s.history || []
        }));
        setSessions(formatted);

        const currentActive = targetActiveId || activeSessionId;
        const nextId = currentActive && formatted.some((s: any) => s.id === currentActive)
          ? currentActive
          : formatted[0].id;

        setActiveSessionId(nextId);
        const activeSess = formatted.find((s: any) => s.id === nextId);
        if (activeSess) {
          setChatHistory(activeSess.history);
        }
        refreshPiContext(tenantKey, nextId);
      }
    } catch (err) {
      console.warn("Failed to refresh pi sessions:", err);
    }
  };

  const refreshPiContext = async (tenantKey: string, sessId?: string) => {
    try {
      const targetId = sessId || activeSessionId;
      if (!targetId) return;
      const res = await api.getPiContext(tenantKey, targetId);
      if (res && res.ok) {
        setPiContext({
          tokensUsed: res.tokensUsed,
          maxTokens: res.maxTokens,
          percentUsed: res.percentUsed,
          messageCount: res.messageCount
        });
      }
    } catch (err) {
      console.warn("Failed to refresh pi context:", err);
    }
  };

  const handleSelectSession = (id: string) => {
    // Guard: block session switch while agent is running
    if (isChatLoading) {
      setToast({ message: 'Cannot switch session while agent is running. Please wait for the current task to finish.', type: 'error', isOpen: true });
      return;
    }
    const s = sessions.find(x => x.id === id);
    if (s) {
      setActiveSessionId(id);
      setChatHistory(s.history);
      const tenantKey = user?.id || activeEntity || 'default_user';
      refreshPiContext(tenantKey, id);
    }
  };

  const handleCreateSession = async () => {
    // Guard: block creating a new session while agent is running
    if (isChatLoading) {
      setToast({ message: 'Cannot create session while agent is running.', type: 'error', isOpen: true });
      return;
    }
    const tenantKey = user?.id || activeEntity || 'default_user';
    try {
      const res = await api.createPiSession(tenantKey, `Session ${sessions.length + 1}`);
      if (res && res.ok && res.session) {
        await refreshPiSessions(tenantKey, res.session.id);
        setShowSessionDropdown(false);
        setToast({ message: '✨ Created new real PI session on disk.', type: 'success', isOpen: true });
      }
    } catch (err: any) {
      console.error("Error creating real pi session:", err);
      setToast({ message: 'Failed to create pi session.', type: 'error', isOpen: true });
    }
  };

  const handleDeleteSession = (id: string) => {
    const sessionName = sessions.find(s => s.id === id)?.name || 'this session';
    setConfirmModal({
      isOpen: true,
      title: 'Delete Chat Session',
      message: `Are you sure you want to delete "${sessionName}"? This action cannot be undone and will permanently delete the session file from disk.`,
      confirmText: 'Delete',
      isDestructive: true,
      onConfirm: async () => {
        const tenantKey = user?.id || activeEntity || 'default_user';
        try {
          await api.deletePiSession(id, tenantKey);
          await refreshPiSessions(tenantKey);
          setConfirmModal(null);
          setToast({ message: 'Session deleted from disk.', type: 'success', isOpen: true });
        } catch (err: any) {
          console.error("Error deleting pi session:", err);
          setConfirmModal(null);
          setToast({ message: 'Failed to delete session.', type: 'error', isOpen: true });
        }
      }
    });
  };

  useEffect(() => {
    if (!activeSessionId || sessions.length === 0) return;
    const active = sessions.find(s => s.id === activeSessionId);
    if (active) {
      if (JSON.stringify(active.history) !== JSON.stringify(chatHistory)) {
        const updated = sessions.map(s => {
          if (s.id === activeSessionId) {
            return { ...s, history: chatHistory };
          }
          return s;
        });
        setSessions(updated);
        const tenantKey = user?.id || activeEntity || 'default_user';
        localStorage.setItem(`pboot_chat_sessions_${tenantKey}`, JSON.stringify(updated));
        api.saveAppConfig({
          user_id: tenantKey,
          settings: {
            autonomy: autonomyLevel,
            notifications: {},
            sync_daemon: true,
            chat_sessions: updated,
            active_session_id: activeSessionId,
            tools_enabled: toolsEnabled,
            theme: theme,
            ui_lang: uiLang
          }
        }).catch(err => console.warn('Failed to sync chat history to app_config:', err));
      }
    }
  }, [chatHistory, activeSessionId, sessions]);

  // SSE Realtime Event Timeline
  const [events, setEvents] = useState<string[]>([]);
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [logFilterType, setLogFilterType] = useState<'all' | 'system' | 'mission'>('all');

  // Supabase Database Subscriptions Realtime states
  const [realtimeEvents, setRealtimeEvents] = useState<Array<{
    id: string;
    timestamp: string;
    table: string;
    eventType: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    newPayload: any;
    oldPayload: any;
  }>>([]);
  const [realtimeSubscriptions, setRealtimeSubscriptions] = useState<Record<string, boolean>>({
    raw_data: true,
    system_components: true,
    missions: true,
    tools: true,
    app_config: true,
    runtime_state: true
  });
  const [isRealtimeActive, setIsRealtimeActive] = useState<boolean>(true);
  const autoSyncUi = true;
  const [selectedRealtimeEvent, setSelectedRealtimeEvent] = useState<any | null>(null);

  useEffect(() => {
    // Supabase is strictly used for Auth; no DB channel subscriptions needed
    return;
  }, []);

  // Relational Database & Multi-Project Custom States for Right Column
  const [rawDataList, setRawDataList] = useState<any[]>([]);
  const [systemComponents, setSystemComponents] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [selectedProjectName, setSelectedProjectName] = useState<string>('all');
  const [isCreatingProjectModal, setIsCreatingProjectModal] = useState<boolean>(false);
  const [newProjectNameInput, setNewProjectNameInput] = useState<string>('');

  // New Artifact Workspace Section States
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);
  const [artifactTab, setArtifactTab] = useState<'preview' | 'code'>('preview');
  const [minArtifactSection, setMinArtifactSection] = useState<boolean>(false);
  const [artifactActiveFile, setArtifactActiveFile] = useState<string>('');
  const [artifactCodeText, setArtifactCodeText] = useState<string>('');
  const [isSavingArtifactCode, setIsSavingArtifactCode] = useState<boolean>(false);
  const [artifactPreviewDevice, setArtifactPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');

  const handleGoToArtifact = (art: any) => {
    if (!art) return;
    setSelectedArtifact(art);
    setArtifactActiveFile(art.name || 'codebase');
    setArtifactCodeText(art.code_snapshot || '');
    setMinArtifactSection(false);
    setArtifactTab('preview');
    setToast({ message: `Viewing artifact "${art.name}" in Artifact section below`, type: 'info', isOpen: true });
    setTimeout(() => {
      const el = document.getElementById('artifact-section-container');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }, 60);
  };

  const handleSaveArtifactCode = async () => {
    if (!selectedArtifact) return;
    setIsSavingArtifactCode(true);
    try {
      const metadata = {
        ...(selectedArtifact.metadata || {}),
        tenantId: selectedArtifact.metadata?.tenantId || activeEntity || 'default_user'
      };
      const res = await fetch('/api/db/system-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedArtifact.id,
          name: selectedArtifact.name,
          role: selectedArtifact.role || 'Uploaded System Component',
          code_snapshot: artifactCodeText,
          metadata
        })
      });
      if (res.ok) {
        setToast({ message: `Saved artifact "${selectedArtifact.name}" codebase to disk & database!`, type: 'success', isOpen: true });
        fetchWorkspaceData();
      } else {
        setToast({ message: 'Failed to save artifact code updates.', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error saving artifact code.', type: 'error', isOpen: true });
    } finally {
      setIsSavingArtifactCode(false);
    }
  };

  // Sync selectedArtifact when systemComponents updates
  useEffect(() => {
    if (systemComponents && systemComponents.length > 0) {
      if (!selectedArtifact) {
        const first = systemComponents[0];
        setSelectedArtifact(first);
        setArtifactActiveFile(first.name || 'codebase');
        setArtifactCodeText(first.code_snapshot || '');
      } else {
        const current = systemComponents.find((sc: any) => sc.id === selectedArtifact.id || sc.name === selectedArtifact.name);
        if (current) {
          setSelectedArtifact(current);
        }
      }
    }
  }, [systemComponents]);

  const handleCreateProject = async () => {
    const proj = newProjectNameInput.trim();
    if (!proj) return;
    try {
      const res = await api.createProject(proj, activeEntity);
      if (res.ok) {
        setProjectsList(res.projects || []);
        setSelectedProjectName(res.projectName || proj);
        setNewProjectNameInput('');
        setIsCreatingProjectModal(false);
        setToast({ message: `Project "${res.projectName || proj}" created successfully!`, type: 'success', isOpen: true });
        fetchWorkspaceData();
      }
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to create project folder', type: 'error', isOpen: true });
    }
  };
  const handleCreateNewProject = handleCreateProject;

  // Toggle default view based on node count: < 2 nodes -> list view, >= 2 nodes -> graph view
  useEffect(() => {
    const totalNodes = rawDataList.length + systemComponents.length;
    if (totalNodes >= 2) {
      setYourDataSystemsView('graph');
    } else {
      setYourDataSystemsView('list');
    }
  }, [rawDataList, systemComponents]);
  const [newCompName, setNewCompName] = useState<string>('');
  const [newCompRole, setNewCompRole] = useState<string>('system');
  const [newCompCode, setNewCompCode] = useState<string>('');
  const [isAddingComp, setIsAddingComp] = useState<boolean>(false);
  const [expandedWorkflow, setExpandedWorkflow] = useState<string | null>(null);

  // Expand and Add Mission states for left & center columns
  const [expandPillars, setExpandPillars] = useState<boolean>(true);
  const [expandObjectives, setExpandObjectives] = useState<boolean>(true);
  const [isAddMissionOpen, setIsAddMissionOpen] = useState<boolean>(false);
  const [newMissionId, setNewMissionId] = useState<string>('');
  const [newMissionObjective, setNewMissionObjective] = useState<string>('');
  const [newMissionCategory, setNewMissionCategory] = useState<'standard' | 'brainstorming' | 'deep_research' | 'analytics' | 'system_build' | 'system_build_from_data' | 'system_optimization' | 'system_optimization_from_data' | 'system_test' | 'system_test_from_data'>('standard');
  const [newMissionPriority, setNewMissionPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  const [isAddingMission, setIsAddingMission] = useState<boolean>(false);

  // Standard Mission Tailored Inputs State
  const [newStandardGoals, setNewStandardGoals] = useState<string[]>([
    'Establish baseline architectural requirements',
    'Execute core feature scope implementation',
    'Verify end-to-end quality and integration gates'
  ]);
  const [newStandardTasks, setNewStandardTasks] = useState<string[]>([
    'task_1: Parse objective & map dependencies',
    'task_2: Implement UI layout and interaction state',
    'task_3: Validate build and run automated tests'
  ]);
  const [newStandardGoalInput, setNewStandardGoalInput] = useState<string>('');
  const [newStandardTaskInput, setNewStandardTaskInput] = useState<string>('');

  // Analytics Tailored Inputs State
  const [analyticsSelectedSystems, setAnalyticsSelectedSystems] = useState<string[]>(['ecom_orders_2026.csv', 'user_sessions_telemetry']);
  const [analyticsSystemCustomInput, setAnalyticsSystemCustomInput] = useState<string>('');
  const [analyticsSelectedKpis, setAnalyticsSelectedKpis] = useState<string[]>(['Conversion Rate (%)', 'CAC (Customer Acquisition)', 'LTV (Lifetime Value)']);
  const [analyticsKpiCustomInput, setAnalyticsKpiCustomInput] = useState<string>('');
  const [analyticsSelectedDimensions, setAnalyticsSelectedDimensions] = useState<string[]>(['Region / Geography', 'Cohort Signup Month', 'Device Type']);
  const [analyticsDimensionCustomInput, setAnalyticsDimensionCustomInput] = useState<string>('');

  // Deep Research Tailored Inputs State
  const [researchSourceType, setResearchSourceType] = useState<'llm' | 'web' | 'youtube' | 'web_youtube'>('web_youtube');
  const [researchSelectedTopics, setResearchSelectedTopics] = useState<string[]>(['Competitive AI Agent Architecture Audit', 'Vector RAG Benchmarks']);
  const [researchTopicCustomInput, setResearchTopicCustomInput] = useState<string>('');
  const [researchSelectedSources, setResearchSelectedSources] = useState<string[]>(['ArXiv.org Research Papers', 'YouTube Tech Transcripts & Talks', 'GitHub Engineering Repos']);
  const [researchSourceCustomInput, setResearchSourceCustomInput] = useState<string>('');
  const [newResearchDepth, setNewResearchDepth] = useState<'quick' | 'standard' | 'exhaustive'>('standard');

  // Brainstorming Tailored Inputs State
  const [brainstormSelectedThemes, setBrainstormSelectedThemes] = useState<string[]>(['Autonomous Workflow Automation', 'Generative UI & Dynamic Dashboards']);
  const [brainstormThemeCustomInput, setBrainstormThemeCustomInput] = useState<string>('');
  const [brainstormFramework, setBrainstormFramework] = useState<string>('McKinsey 7S Framework');
  const [brainstormSelectedConstraints, setBrainstormSelectedConstraints] = useState<string[]>(['Zero external SDK dependencies', '<100ms latency threshold']);
  const [brainstormConstraintCustomInput, setBrainstormConstraintCustomInput] = useState<string>('');

  // System Build / Pipeline Tailored Inputs State
  const [systemBuildMode, setSystemBuildMode] = useState<'scratch' | 'extension' | 'refactor'>('scratch');
  const [pipelineSelectedStack, setPipelineSelectedStack] = useState<string[]>(['React 19 / Next.js 16', 'TypeScript 5.8', 'Tailwind CSS v4', 'Node.js']);
  const [pipelineStackCustomInput, setPipelineStackCustomInput] = useState<string>('');
  const [pipelineSelectedPaths, setPipelineSelectedPaths] = useState<string[]>(['/frontend-next/app/dashboard/page.tsx', 'server.ts']);
  const [pipelinePathCustomInput, setPipelinePathCustomInput] = useState<string>('');
  const [pipelineSelectedGates, setPipelineSelectedGates] = useState<string[]>(['QA Unit Tests', 'TypeScript Compile Check', 'Build Synthesis']);
  const [pipelineGateCustomInput, setPipelineGateCustomInput] = useState<string>('');

  // Extra Sources / Prior Outputs Context State
  const [selectedExtraSources, setSelectedExtraSources] = useState<string[]>([]);
  const [extraSourcesCustomInput, setExtraSourcesCustomInput] = useState<string>('');
  const [inspectingSourceOutput, setInspectingSourceOutput] = useState<any | null>(null);

  // AI Auto-Generation Loading State
  const [isAiGeneratingInputs, setIsAiGeneratingInputs] = useState<boolean>(false);

  // GCS Workspace Map State
  const [workspaceMapData, setWorkspaceMapData] = useState<any | null>(null);

  // Interactive Mission Control Modal States
  const [selectedMission, setSelectedMission] = useState<any | null>(null);

  const handleSelectMission = async (m: any) => {
    if (!m || !m.id) {
      setSelectedMission(m);
      return;
    }
    try {
      const res = await missionsApi.getMissionDetails(m.id);
      if (res && res.ok && res.mission) {
        setSelectedMission(res.mission);
        return;
      }
    } catch (e) {
      console.warn('Failed fetching mission details from GCS /missions/ directory:', e);
    }
    setSelectedMission(m);
  };
  const [qaUserSelection, setQaUserSelection] = useState<string>('');
  const [qaCustomInput, setQaCustomInput] = useState<string>('');
  const [qaResolved, setQaResolved] = useState<boolean>(false);

  // E-Commerce Lineage Map States
  const [ecomDataItems, setEcomDataItems] = useState<any[]>([]);
  const [compareCodeId, setCompareCodeId] = useState<string | null>(null);
  const [isAddingEcomItem, setIsAddingEcomItem] = useState<boolean>(false);
  const [showAllEcomPortfolio, setShowAllEcomPortfolio] = useState<boolean>(false);

  // Custom ecom item form inputs
  const [ecomNewName, setEcomNewName] = useState<string>('');
  const [ecomNewType, setEcomNewType] = useState<'raw_data' | 'system'>('raw_data');
  const [ecomNewExample, setEcomNewExample] = useState<string>('');
  const [ecomNewDesc, setEcomNewDesc] = useState<string>('');
  const [ecomNewStatus, setEcomNewStatus] = useState<string>('new');
  const [ecomNewHasLegacy, setEcomNewHasLegacy] = useState<boolean>(false);
  const [ecomNewLegacyCode, setEcomNewLegacyCode] = useState<string>('');
  const [ecomNewEnhancedCode, setEcomNewEnhancedCode] = useState<string>('');

  // Right sidebar specific states
  const [rawDataFilter, setRawDataFilter] = useState<'all' | 'new' | 'in_process' | 'processed'>('all');
  const [systemComponentFilter, setSystemComponentFilter] = useState<'all' | 'new' | 'in_process' | 'processed' | 'built_new' | 'enhanced'>('all');
  const [expandedRawDataIds, setExpandedRawDataIds] = useState<string[]>([]);
  const [expandedSystemComponentIds, setExpandedSystemComponentIds] = useState<string[]>([]);
  const [editingSystemComponentId, setEditingSystemComponentId] = useState<string | null>(null);
  const [tempLegacyCode, setTempLegacyCode] = useState<string>('');
  const [tempActiveCode, setTempActiveCode] = useState<string>('');

  useEffect(() => {
    if (selectedMission) {
      setQaUserSelection(selectedMission.qa_state?.user_selection || '');
      setQaCustomInput(selectedMission.qa_state?.custom_input || '');
      setQaResolved(!!selectedMission.qa_state?.resolved);
    }
  }, [selectedMission]);

  const missionPresets = [
    {
      id: 'mckinsey_swot_alignment',
      name: 'McKinsey SWOT Alignment',
      category: 'standard',
      priority: 'HIGH',
      objective: 'Conduct a thorough SWOT analysis of workspace capabilities aligned with current customer signal trends.'
    },
    {
      id: 'strategic_competitiveness_audit',
      name: 'Strategic Competitiveness Audit',
      category: 'system_build',
      priority: 'MEDIUM',
      objective: 'Audit current market competitiveness against industry-leading context structures to identify capability gaps.'
    },
    {
      id: 'backlog_rationalization',
      name: 'Backlog Rationalization',
      category: 'system_build_from_data',
      priority: 'MEDIUM',
      objective: 'Trace, clean, and map the active workspace backlog to eliminate redundant tasks and align with user intent.'
    },
    {
      id: 'continuous_alignment_flow',
      name: 'Continuous Alignment Flow',
      category: 'system_build_from_data',
      priority: 'HIGH',
      objective: 'Establish real-time strategic alignment monitoring for incoming customer feedback and response flows.'
    },
    {
      id: 'self_evolving_pipeline',
      name: 'Self-Optimizing System Flow',
      category: 'system_optimization',
      priority: 'CRITICAL',
      objective: 'Configure agent self-evolution cycles to automatically optimize and refactor workspace code layers based on metrics.'
    },
    {
      id: 'harden_context_security',
      name: 'Harden Context Security Gating',
      category: 'standard',
      priority: 'HIGH',
      objective: 'Enhance sandboxing and strict validation on all third-party context data parsed by the agent.'
    },
    {
      id: 'multidimensional_telemetry_deepdive',
      name: 'Deep Analytics Telemetry Scan',
      category: 'analytics',
      priority: 'HIGH',
      objective: 'Synthesize multi-channel logs and raw telemetry to build dynamic backlogs and error trend models.'
    },
    {
      id: 'multi_vector_market_intelligence',
      name: 'Deep Research Intelligence Audit',
      category: 'deep_research',
      priority: 'HIGH',
      objective: 'Perform a comprehensive competitive audit on context processing technologies across industry leaders.'
    },
    {
      id: 'vision_2027_product_brainstorm',
      name: 'Vision 2027 Strategic Brainstorming',
      category: 'brainstorming',
      priority: 'HIGH',
      objective: 'Run a multi-workflow brainstorming loop blending deep market scans, telemetry-backed analytics, and thorough QA verification to outline our long-term system evolution goals.'
    }
  ];

  // Layout improvement states
  const [isToolsWindowOpen, setIsToolsWindowOpen] = useState<boolean>(false);
  const [toolsWindowTab, setToolsWindowTab] = useState<'skills' | 'extensions'>('skills');
  const [isAgentsMdWindowOpen, setIsAgentsMdWindowOpen] = useState<boolean>(false);
  const [isAutonomyHoverOpen, setIsAutonomyHoverOpen] = useState<boolean>(false);
  const [autonomyPos, setAutonomyPos] = useState<{ bottom: number; left: number } | null>(null);
  const autonomyHoverTimerRef = useRef<any>(null);

  const handleAutonomyMouseEnter = (rect?: DOMRect) => {
    if (autonomyHoverTimerRef.current) {
      clearTimeout(autonomyHoverTimerRef.current);
      autonomyHoverTimerRef.current = null;
    }
    if (rect) {
      setAutonomyPos({
        bottom: Math.max(10, Math.round(window.innerHeight - rect.top + 2)),
        left: Math.max(10, Math.min(Math.round(rect.left), window.innerWidth - 225))
      });
    }
    setIsAutonomyHoverOpen(true);
  };

  const handleAutonomyMouseLeave = () => {
    if (autonomyHoverTimerRef.current) {
      clearTimeout(autonomyHoverTimerRef.current);
    }
    autonomyHoverTimerRef.current = setTimeout(() => {
      setIsAutonomyHoverOpen(false);
    }, 300);
  };
  const [chatInputHeight, setChatInputHeight] = useState<number>(96);
  const [isDraggingChatInput, setIsDraggingChatInput] = useState<boolean>(false);
  const [isAccountWindowOpen, setIsAccountWindowOpen] = useState<boolean>(false);
  const [isLogsWindowOpen, setIsLogsWindowOpen] = useState<boolean>(false);
  const [activeLogTab, setActiveLogTab] = useState<'user_logs' | 'system' | 'cli'>('user_logs');
  const [userLogsData, setUserLogsData] = useState<any>(null);
  const [isFetchingUserLogs, setIsFetchingUserLogs] = useState<boolean>(false);
  const [userLogsViewMode, setUserLogsViewMode] = useState<'stream' | 'json'>('stream');
  const [cliLogs, setCliLogs] = useState<any[]>([]);
  const [isFetchingCliLogs, setIsFetchingCliLogs] = useState<boolean>(false);
  const [selectedCliLog, setSelectedCliLog] = useState<any>(null);
  const [cliTerminalInput, setCliTerminalInput] = useState<string>('');
  const [isCliRunning, setIsCliRunning] = useState<boolean>(false);
  const [cliTerminalOutput, setCliTerminalOutput] = useState<string>('Pi CLI Child Process Terminal Ready.\nType a prompt or command below to run against the @paiml/pi-coding-agent child process.\n');
  const [accountSubTab, setAccountSubTab] = useState<'details' | 'credits' | 'paug' | 'free_tokens' | 'stripe'>('details');
  const [isStripeLoading, setIsStripeLoading] = useState<boolean>(false);
  const [userPaymentHistory, setUserPaymentHistory] = useState<any[]>([]);
  const [showCardModal, setShowCardModal] = useState<boolean>(false);
  const [cardNumber, setCardNumber] = useState<string>('4242 4242 4242 4242');
  const [cardExpiry, setCardExpiry] = useState<string>('12/29');
  const [cardCvc, setCardCvc] = useState<string>('123');
  const [cardZip, setCardZip] = useState<string>('90210');
  const [cardBrand, setCardBrand] = useState<string>('Visa');
  const [activeInvoice, setActiveInvoice] = useState<any>(null);
  const [stripeSimAmount, setStripeSimAmount] = useState<string>('500'); // Prevent any leftover references if any

  // Managed LLM Credits, Free Token Pool, and PAUG Infrastructure States
  const [userTierData, setUserTierData] = useState<any>(null);
  const [isTierLoading, setIsTierLoading] = useState<boolean>(false);
  const [keyPoolStats, setKeyPoolStats] = useState<any>(null);
  const [freeModelsList, setFreeModelsList] = useState<any[]>([]);
  const [isVerifyingCard, setIsVerifyingCard] = useState<boolean>(false);
  const [poolNewKey, setPoolNewKey] = useState<string>('');
  const [poolNewProvider, setPoolNewProvider] = useState<'gemini' | 'openrouter'>('gemini');
  const [poolNewLabel, setPoolNewLabel] = useState<string>('');

  const fetchKeyPoolStats = async () => {
    try {
      const res = await fetch('/api/llm/key-pool/stats');
      const data = await res.json();
      if (data.ok && data.stats) {
        setKeyPoolStats(data.stats);
      }
    } catch (e) {
      console.warn('Failed to fetch key pool stats:', e);
    }
  };

  const fetchFreeModels = async () => {
    try {
      const res = await fetch('/api/llm/free-models');
      const data = await res.json();
      if (data.ok && data.models) {
        setFreeModelsList(data.models);
      }
    } catch (e) {
      console.warn('Failed to fetch free models:', e);
    }
  };

  const handleVerifyCardForFreeTier = async (cardLast4Input?: string, cardBrandInput?: string) => {
    setIsVerifyingCard(true);
    try {
      const tenantId = user?.id || 'sandbox-default-local';
      const last4 = cardLast4Input || cardNumber.replace(/\s/g, '').slice(-4) || '4242';
      const brand = cardBrandInput || cardBrand || 'Visa';
      const res = await fetch('/api/user/card/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, cardLast4: last4, brand })
      });
      const data = await res.json();
      if (data.ok && data.tier) {
        const updatedTier = { ...data.tier, cardVerified: true, hasVerifiedCard: true, paymentVerified: true };
        setUserTierData(updatedTier);
        if (typeof window !== 'undefined') {
          localStorage.setItem('fabrica_card_verified', 'true');
        }
        setToast({ message: `Card ending in ${last4} verified successfully! Free token access activated.`, type: 'success', isOpen: true });
        fetchKeyPoolStats();
      } else {
        setToast({ message: data.error || 'Card verification failed.', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error verifying card', type: 'error', isOpen: true });
    } finally {
      setIsVerifyingCard(false);
    }
  };

  const handleAddKeyToPool = async () => {
    if (!poolNewKey.trim()) {
      setToast({ message: 'Please enter a valid API key string', type: 'error', isOpen: true });
      return;
    }
    try {
      const res = await fetch('/api/llm/key-pool/add-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: poolNewProvider, key: poolNewKey, label: poolNewLabel || undefined })
      });
      const data = await res.json();
      if (data.ok) {
        setKeyPoolStats(data.stats);
        setPoolNewKey('');
        setPoolNewLabel('');
        setToast({ message: `API key added to ${poolNewProvider.toUpperCase()} pool load balancer!`, type: 'success', isOpen: true });
      } else {
        setToast({ message: data.error || 'Failed to add key to pool', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error adding key to pool', type: 'error', isOpen: true });
    }
  };

  const fetchUserTierData = async () => {
    setIsTierLoading(true);
    try {
      const tenantId = user?.id || 'sandbox-default-local';
      const res = await fetch(`/api/user/tier?tenantId=${encodeURIComponent(tenantId)}`);
      const data = await res.json();
      if (data.ok && data.tier) {
        const isLocallyVerified = typeof window !== 'undefined' && localStorage.getItem('fabrica_card_verified') === 'true';
        if (isLocallyVerified || data.tier.cardVerified || data.tier.hasVerifiedCard || data.tier.paymentVerified) {
          data.tier.cardVerified = true;
          data.tier.hasVerifiedCard = true;
          data.tier.paymentVerified = true;
        }
        setUserTierData(data.tier);
      }
    } catch (err) {
      console.warn('Failed to fetch user tier data:', err);
    } finally {
      setIsTierLoading(false);
    }
  };

  const getQuotaMetrics = (tierData: any) => {
    const qs = tierData?.quotaSummary;
    const monthlyQuotaTokens = Number(qs?.monthlyQuotaTokens ?? qs?.monthlyQuota ?? tierData?.monthlyTokenQuota ?? 500000);
    const monthlyQuotaUSD = Number(qs?.monthlyQuotaUSD ?? 5.00);
    const usedTokensThisMonth = Number(qs?.usedTokensThisMonth ?? qs?.usedTokens ?? tierData?.usedTokensThisMonth ?? tierData?.llmCredits?.totalTokensUsed ?? 0);
    const remainingTokensThisMonth = Number(qs?.remainingTokensThisMonth ?? qs?.remainingTokens ?? tierData?.remainingTokensThisMonth ?? Math.max(0, monthlyQuotaTokens - usedTokensThisMonth));
    const balanceUSD = tierData?.llmCredits?.balanceUSD ?? 5.00;
    const remainingCreditsUSD = Number(qs?.remainingCreditsUSD ?? Math.max(0, balanceUSD));

    const rawRatio = monthlyQuotaTokens > 0 ? remainingTokensThisMonth / monthlyQuotaTokens : 1;
    const percentRemaining = Number(qs?.percentRemaining ?? Math.min(100, Math.max(0, Math.round(rawRatio * 100))));
    const percentUsed = Number(qs?.percentUsed ?? qs?.usagePercentage ?? Math.min(100, Math.max(0, 100 - percentRemaining)));

    let statusColor = qs?.statusColor || '#10b981';
    let statusLabel = qs?.statusLabel || 'OPTIMAL BALANCE';

    if (percentRemaining <= 10) {
      statusColor = '#ef4444';
      statusLabel = 'CRITICAL EXHAUSTION (<10%)';
    } else if (percentRemaining <= 25) {
      statusColor = '#f59e0b';
      statusLabel = 'LOW QUOTA ALERT (<25%)';
    } else if (percentRemaining <= 50) {
      statusColor = '#3b82f6';
      statusLabel = 'QUOTA NOTICE (<50%)';
    }

    return {
      monthlyQuotaTokens,
      monthlyQuotaUSD,
      usedTokensThisMonth,
      remainingTokensThisMonth,
      remainingCreditsUSD,
      percentRemaining,
      percentUsed,
      statusColor,
      statusLabel,
      tierName: qs?.tierName || tierData?.plan || 'Free Starter Tier ($0)'
    };
  };

  const renderQuotaWarningAlert = (q: any) => {
    if (!q) return null;
    const percentRemaining = q.percentRemaining ?? 100;
    const percentUsed = q.percentUsed ?? 0;
    const remainingTokens = Number(q.remainingTokensThisMonth || q.remainingTokens || 0).toLocaleString();
    const usedTokens = Number(q.usedTokensThisMonth || q.usedTokens || 0).toLocaleString();
    const remainingCreditsUSD = (Number(q.remainingCreditsUSD) || 0).toFixed(2);

    if (percentRemaining > 50) {
      return (
        <div style={{
          background: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          borderRadius: '6px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '8.5px',
          color: '#10b981'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✅</span>
            <span style={{ fontWeight: 700 }}>Quota Status: Optimal Balance</span>
            <span style={{ color: 'var(--muted)' }}>— {percentRemaining}% remaining ({remainingTokens} tokens available)</span>
          </div>
          <span style={{ fontSize: '7.5px', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 6px', borderRadius: '3px', fontWeight: 800 }}>
            &gt;50% HEALTHY
          </span>
        </div>
      );
    }

    let alertConfig = {
      bg: 'rgba(59, 130, 246, 0.08)',
      border: '1px solid rgba(59, 130, 246, 0.35)',
      color: '#3b82f6',
      badgeBg: 'rgba(59, 130, 246, 0.2)',
      icon: 'ℹ️',
      badgeText: '50% QUOTA NOTICE',
      title: '50% Monthly Quota Threshold Reached',
      message: `You have consumed ${percentUsed}% of your monthly LLM quota (${usedTokens} tokens used). ${remainingTokens} tokens remaining.`
    };

    if (percentRemaining <= 10) {
      alertConfig = {
        bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(185, 28, 28, 0.08))',
        border: '1.5px solid rgba(239, 68, 68, 0.6)',
        color: '#ef4444',
        badgeBg: 'rgba(239, 68, 68, 0.25)',
        icon: '🚨',
        badgeText: '10% CRITICAL QUOTA EXHAUSTION',
        title: 'Critical Warning: LLM Quota Nearly Exhausted (<10%)',
        message: `Only ${percentRemaining}% (${remainingTokens} tokens / $${remainingCreditsUSD} USD) remaining! Immediate top-up recommended to avoid execution throttling.`
      };
    } else if (percentRemaining <= 25) {
      alertConfig = {
        bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(217, 119, 6, 0.06))',
        border: '1.5px solid rgba(245, 158, 11, 0.5)',
        color: '#f59e0b',
        badgeBg: 'rgba(245, 158, 11, 0.2)',
        icon: '⚠️',
        badgeText: '25% LOW QUOTA ALERT',
        title: 'Warning: Low LLM Token Quota (<25% Remaining)',
        message: `You have dropped below 25% remaining quota (${remainingTokens} tokens left). Consider refilling your balance soon.`
      };
    }

    return (
      <div style={{
        background: alertConfig.bg,
        border: alertConfig.border,
        borderRadius: '8px',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: `0 2px 10px ${alertConfig.color}15`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px' }}>{alertConfig.icon}</span>
            <span style={{ fontSize: '9.5px', fontWeight: 900, color: alertConfig.color, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              {alertConfig.title}
            </span>
          </div>
          <span style={{
            fontSize: '7.5px',
            fontWeight: 800,
            background: alertConfig.badgeBg,
            color: alertConfig.color,
            padding: '2px 6px',
            borderRadius: '4px',
            letterSpacing: '0.04em'
          }}>
            {alertConfig.badgeText}
          </span>
        </div>
        <p style={{ margin: 0, fontSize: '8.5px', color: 'var(--text-bright)', lineHeight: 1.4 }}>
          {alertConfig.message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
          <span style={{ fontSize: '8px', color: 'var(--muted)' }}>
            Remaining Balance: <b>${remainingCreditsUSD} USD</b> ({remainingTokens} tokens)
          </span>
          <button
            onClick={() => handleTopUpCredits(10)}
            disabled={isTierLoading}
            style={{
              background: alertConfig.color,
              border: 'none',
              borderRadius: '4px',
              color: '#ffffff',
              fontSize: '8px',
              fontWeight: 800,
              padding: '3px 8px',
              cursor: 'pointer'
            }}
          >
            ⚡ Refill +$10.00 Now
          </button>
        </div>
      </div>
    );
  };

  const handleTopUpCredits = async (amountUSD: number) => {
    setIsTierLoading(true);
    try {
      const tenantId = user?.id || 'sandbox-default-local';
      const res = await fetch('/api/user/credits/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, amountUSD, description: `Manual top-up of $${amountUSD}` })
      });
      const data = await res.json();
      if (data.ok && data.tier) {
        setUserTierData(data.tier);
        setToast({ message: data.message || `Successfully topped up $${amountUSD.toFixed(2)} credits!`, type: 'success', isOpen: true });
      } else {
        setToast({ message: data.error || 'Failed to top up credits', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error topping up credits', type: 'error', isOpen: true });
    } finally {
      setIsTierLoading(false);
    }
  };

  const handleSubscribeCreditPlan = async (planId: string) => {
    setIsTierLoading(true);
    try {
      const tenantId = user?.id || 'sandbox-default-local';
      const res = await fetch('/api/user/credits/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, planId })
      });
      const data = await res.json();
      if (data.ok && data.tier) {
        setUserTierData(data.tier);
        setToast({ message: data.message || `Subscribed to credit plan!`, type: 'success', isOpen: true });
      } else {
        setToast({ message: data.error || 'Failed to update subscription', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error updating subscription', type: 'error', isOpen: true });
    } finally {
      setIsTierLoading(false);
    }
  };

  const handleToggleAutoTopup = async (enabled: boolean) => {
    setIsTierLoading(true);
    try {
      const tenantId = user?.id || 'sandbox-default-local';
      const res = await fetch('/api/user/credits/auto-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, enabled, thresholdUSD: 2, amountUSD: 10 })
      });
      const data = await res.json();
      if (data.ok && data.tier) {
        setUserTierData(data.tier);
        setToast({ message: `Auto top-up ${enabled ? 'enabled' : 'disabled'}!`, type: 'success', isOpen: true });
      } else {
        setToast({ message: data.error || 'Failed to update auto top-up settings', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error setting auto top-up', type: 'error', isOpen: true });
    } finally {
      setIsTierLoading(false);
    }
  };

  const handleUpgradeToPaug = async () => {
    setIsTierLoading(true);
    try {
      const tenantId = user?.id || 'sandbox-default-local';
      const res = await fetch('/api/user/plan/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      const data = await res.json();
      if (data.ok && data.tier) {
        setUserTierData(data.tier);
        setToast({ message: data.message || 'Successfully upgraded to PAUG Dedicated Tier!', type: 'success', isOpen: true });
      } else {
        setToast({ message: data.error || 'Failed to upgrade to PAUG', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error upgrading tier', type: 'error', isOpen: true });
    } finally {
      setIsTierLoading(false);
    }
  };

  const handleDowngradeToFree = async () => {
    setIsTierLoading(true);
    try {
      const tenantId = user?.id || 'sandbox-default-local';
      const res = await fetch('/api/user/plan/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      const data = await res.json();
      if (data.ok && data.tier) {
        setUserTierData(data.tier);
        setToast({ message: data.message || 'Switched back to Shared Free Tier.', type: 'info', isOpen: true });
      } else {
        setToast({ message: data.error || 'Failed to downgrade tier', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error toggling tier', type: 'error', isOpen: true });
    } finally {
      setIsTierLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTierData();
  }, [user]);

  // Workspace Setup Progress Overlay Verification (Runs EVERY time user enters dashboard)
  useEffect(() => {
    if (!user) return;
    const tenantKey = user.id || 'default_user';

    setIsTenantSetupInitializing(true);
    setTenantSetupProgress(10);
    setTenantSetupStep('1/5: Verifying Supabase User & Tier Subscription...');

    let isMounted = true;

    async function runTenantVerificationSequence() {
      try {
        await new Promise(r => setTimeout(r, 250));
        if (!isMounted) return;

        // Step 1: Query Supabase init status
        setTenantSetupProgress(25);
        setTenantSetupStep('2/5: Verifying Tenant Identity & Vault Credentials in Supabase...');
        const initRes = await api.getInitStatus(tenantKey);

        await new Promise(r => setTimeout(r, 250));
        if (!isMounted) return;

        // Step 2: Verify GCS Bucket
        setTenantSetupProgress(50);
        setTenantSetupStep(`3/5: Verifying Dedicated GCS Bucket (${initRes.bucketId || 'fabrica-tenant-' + tenantKey.slice(0, 8)})...`);

        await new Promise(r => setTimeout(r, 250));
        if (!isMounted) return;

        // Step 3: Verify User Container
        setTenantSetupProgress(75);
        setTenantSetupStep(`4/5: Verifying User Container Instance (${initRes.containerId || 'fabrica-runner-' + tenantKey.slice(0, 8)})...`);

        if (!initRes.initialized || !initRes.onboardingCompleted) {
          setTenantSetupProgress(85);
          setTenantSetupStep('5/5: Provisioning Tenant Workspace & Syncing Storage...');
          await api.initializeTenant(tenantKey);
        } else {
          setTenantSetupProgress(90);
          setTenantSetupStep('5/5: Syncing Workspace & Missions State...');
          await new Promise(r => setTimeout(r, 200));
        }

        if (!isMounted) return;
        setIsAgentInitialized(Boolean(initRes.agentInitialized));
        setTenantSetupProgress(100);
        setTenantSetupStep('Verification complete! Opening Fabrica Dashboard...');

        setTimeout(() => {
          if (isMounted) {
            setIsTenantSetupInitializing(false);
            fetchWorkspaceData();
          }
        }, 350);
      } catch (err: any) {
        console.error('Workspace verification sequence error:', err);
        setTenantSetupStep('Verification Notice: Retrying Supabase & GCS connection...');
        // Retry once or allow manual retry
        setTimeout(async () => {
          try {
            const fallbackRes = await api.initializeTenant(tenantKey);
            if (fallbackRes && fallbackRes.ok) {
              setTenantSetupProgress(100);
              setTenantSetupStep('Verification succeeded!');
              setTimeout(() => {
                if (isMounted) {
                  setIsTenantSetupInitializing(false);
                  fetchWorkspaceData();
                }
              }, 300);
            }
          } catch (e) {
            console.error('Retry failed:', e);
          }
        }, 1000);
      }
    }

    runTenantVerificationSequence();

    return () => {
      isMounted = false;
    };
  }, [user]);

  useEffect(() => {
    if (isAccountWindowOpen || isAccountHoverOpen) {
      fetchUserTierData();
      const interval = setInterval(() => {
        fetchUserTierData();
      }, 4000);
      return () => clearInterval(interval);
    }
  }, [isAccountWindowOpen, isAccountHoverOpen, user]);

  // Load payment history from local storage on modal open
  useEffect(() => {
    if (isAccountWindowOpen && user) {
      const savedHistory = localStorage.getItem(`fabrica_payment_history_${user.id}`);
      if (savedHistory) {
        try {
          setUserPaymentHistory(JSON.parse(savedHistory));
        } catch (e) {
          console.error("Failed to parse payment history:", e);
        }
      } else {
        const baseAmt = selectedPlan === 'enterprise' ? 249.00 : selectedPlan === 'power' ? 49.00 : 0;
        if (baseAmt > 0) {
          const initialHistory = [
            {
              id: 'ch_' + Math.random().toString(36).substring(2, 11),
              amount: baseAmt,
              date: new Date().toISOString(),
              status: 'succeeded',
              plan: selectedPlan,
              cardBrand: 'Visa',
              cardLast4: '4242'
            }
          ];
          localStorage.setItem(`fabrica_payment_history_${user.id}`, JSON.stringify(initialHistory));
          setUserPaymentHistory(initialHistory);
        } else {
          setUserPaymentHistory([]);
        }
      }
    }
  }, [isAccountWindowOpen, user, selectedPlan]);
  const [realtimeTableFilter, setRealtimeTableFilter] = useState<string>('all');
  const [realtimeEventFilter, setRealtimeEventFilter] = useState<string>('all');
  const [autonomyLevel, setAutonomyLevel] = useState<'off' | 'director' | 'worker'>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('fabrica_autonomy_level') as any) || 'director' : 'director')
  );
  const [thinkingLevel, setThinkingLevel] = useState<'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | 'max'>(
    () => (typeof window !== 'undefined' ? (localStorage.getItem('fabrica_thinking_level') as any) || 'low' : 'low')
  );
  const [autonomyInterval, setAutonomyInterval] = useState<number>(20);
  const [isAutonomyOn, setIsAutonomyOn] = useState<boolean>(true);
  const [autoMissionsProcessing, setAutoMissionsProcessing] = useState<boolean>(true);
  const [autoImportsProcessing, setAutoImportsProcessing] = useState<boolean>(true);
  const [lastHeartbeatTime, setLastHeartbeatTime] = useState<string>('');
  const [heartbeatStatus, setHeartbeatStatus] = useState<'testing' | 'active' | 'no_key' | 'no_context' | 'error'>('testing');
  const [heartbeatStatusText, setHeartbeatStatusText] = useState<string>('Testing API Key & workspace context...');
  const [isHeartbeatRunning, setIsHeartbeatRunning] = useState<boolean>(false);
  const isHeartbeatInFlightRef = useRef<boolean>(false);
  const heartbeatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [toolsEnabled, setToolsEnabled] = useState<boolean>(true);
  const [uiLang, setUiLang] = useState<'EN' | 'FR' | 'AR'>('EN');
  const dtxt = DASHBOARD_TEXT[uiLang] || DASHBOARD_TEXT.EN;
  const [agentLang, setAgentLang] = useState<'EN' | 'FR' | 'AR'>('EN');

  // Load theme and initial dismiss state on client mount
  useEffect(() => {
    document.documentElement.classList.add('dashboard-html');
    document.body.classList.add('dashboard-body');

    const savedTheme = localStorage.getItem('pb_theme') || 'light';
    setTheme(savedTheme as any);
    document.documentElement.setAttribute('data-theme', savedTheme);

    const savedUiLang = (localStorage.getItem('fabrica_ui_lang') as 'EN' | 'FR' | 'AR') || 'EN';
    setUiLang(savedUiLang);

    const savedAgentLang = (localStorage.getItem('fabrica_agent_lang') as 'EN' | 'FR' | 'AR') || 'EN';
    setAgentLang(savedAgentLang);

    harnessApi.getHarnessState(activeEntity || 'default_user').then(res => {
      if (res.ok && res.harness) {
        if (res.harness.agent_lang) {
          setAgentLang(res.harness.agent_lang as any);
          localStorage.setItem('fabrica_agent_lang', res.harness.agent_lang);
        }
        if (typeof res.harness.autonomy_interval === 'number') {
          setAutonomyInterval(res.harness.autonomy_interval);
        }
        if (typeof res.harness.auto_missions_processing === 'boolean') {
          setAutoMissionsProcessing(res.harness.auto_missions_processing);
        }
        if (typeof res.harness.auto_imports_processing === 'boolean') {
          setAutoImportsProcessing(res.harness.auto_imports_processing);
        }
        if (res.harness.autonomy) {
          if (res.harness.autonomy === 'off') {
            setIsAutonomyOn(false);
          } else {
            setIsAutonomyOn(true);
            if (['autonomous', 'semi-autonomous', 'manual'].includes(res.harness.autonomy)) {
              setAutonomyLevel(res.harness.autonomy as any);
            }
          }
        }
      }
    }).catch(() => {});

    const isHeroDismissed = localStorage.getItem('pb_hero_dismissed') === '1';
    setHeroCollapsed(isHeroDismissed);

    const savedGeminiKey = localStorage.getItem('pb_gemini_key') || '';
    setGeminiApiKey(savedGeminiKey);
    originalGeminiKey.current = savedGeminiKey;

    const savedOpenRouterKey = localStorage.getItem('pb_openrouter_key') || '';
    setOpenrouterApiKey(savedOpenRouterKey);
    originalOpenrouterKey.current = savedOpenRouterKey;

    const savedAnthropicKey = localStorage.getItem('pb_anthropic_key') || '';
    setAnthropicApiKey(savedAnthropicKey);
    originalAnthropicKey.current = savedAnthropicKey;

    let savedModel = localStorage.getItem('pb_chat_model') || 'gemini-3.6-flash';
    if (savedModel === 'gemini-2.5-flash') {
      savedModel = 'gemini-3.6-flash';
    } else if (savedModel === 'gemini-2.5-pro') {
      savedModel = 'gemini-2.0-pro-exp-02-05';
    }
    setChatModel(savedModel);

    api.getProvidersConfig()
      .then(cfg => {
        setBackendKeys(cfg);
      })
      .catch(err => {
        console.error("Failed to load provider config from backend:", err);
      });

    api.getAppConfig()
      .then(cfg => {
        if (cfg && cfg.settings && cfg.settings.autonomy) {
          setAutonomyLevel(cfg.settings.autonomy);
        }
      })
      .catch(err => console.warn('Failed to load initial app config:', err));

    // Load tenant-specific real PI agent sessions from CLI harness
    const tenantKey = user?.id || activeEntity || 'default_user';
    refreshPiSessions(tenantKey);

    return () => {
      document.documentElement.classList.remove('dashboard-html');
      document.body.classList.remove('dashboard-body');
    };
  }, []);

  // Re-sync user app_config & chat sessions when authenticated user changes
  useEffect(() => {
    if (!user) return;
    const tenantKey = user.id || 'default_user';
    api.getAppConfig(tenantKey)
      .then(cfg => {
        if (cfg && cfg.settings) {
          if (cfg.settings.autonomy) {
            setAutonomyLevel(cfg.settings.autonomy);
          }
          if (cfg.settings.tools_enabled !== undefined) {
            setToolsEnabled(cfg.settings.tools_enabled);
          }
          if (cfg.settings.theme) {
            setTheme(cfg.settings.theme);
          }
          if (cfg.settings.ui_lang) {
            setUiLang(cfg.settings.ui_lang);
          }
          if (cfg.settings.layout) {
            const l = cfg.settings.layout;
            if (typeof l.minCenter === 'boolean') setMinCenter(l.minCenter);
            if (typeof l.minSide === 'boolean') setMinSide(l.minSide);
            if (l.leftTab) setLeftTab(l.leftTab);
            if (typeof l.chatInputHeight === 'number' && !isNaN(l.chatInputHeight)) setChatInputHeight(Math.max(96, l.chatInputHeight));
            if (typeof l.leftSideW === 'number' && !isNaN(l.leftSideW)) setLeftSideW(l.leftSideW);
            if (typeof l.sideW === 'number' && !isNaN(l.sideW)) setSideW(l.sideW);
            if (l.agentWin && typeof l.agentWin.w === 'number') setAgentWin(l.agentWin);
            if (l.agentBtnWin && typeof l.agentBtnWin.x === 'number') setAgentBtnWin(l.agentBtnWin);
          }
          if (Array.isArray(cfg.settings.chat_sessions) && cfg.settings.chat_sessions.length > 0) {
            setSessions(cfg.settings.chat_sessions);
            const activeId = cfg.settings.active_session_id || cfg.settings.chat_sessions[0].id;
            setActiveSessionId(activeId);
            const activeSess = cfg.settings.chat_sessions.find((s: any) => s.id === activeId);
            if (activeSess) {
              setChatHistory(activeSess.history);
            }
          }
        }
      })
      .catch(err => console.warn('Failed to load user app config:', err));
  }, [user]);

  // Persistent Layout Saver & Restore Engine
  const saveLayoutConfig = useCallback((
    newMinCenter = minCenter,
    newMinSide = minSide,
    newLeftTab = leftTab,
    newChatInputHeight = chatInputHeight,
    newAgentWin = agentWin,
    newAgentBtnWin = agentBtnWin,
    newLeftSideW = leftSideW,
    newSideW = sideW
  ) => {
    const layoutConfig = {
      leftSideW: newLeftSideW,
      sideW: newSideW,
      minCenter: newMinCenter,
      minSide: newMinSide,
      leftTab: newLeftTab,
      chatInputHeight: newChatInputHeight,
      agentWin: newAgentWin,
      agentBtnWin: newAgentBtnWin
    };

    const tenantKey = user?.id || activeEntity || 'default_user';

    try {
      localStorage.setItem(`fabrica_layout_${tenantKey}`, JSON.stringify(layoutConfig));
      localStorage.setItem('fabrica_layout_global', JSON.stringify(layoutConfig));
    } catch (err) {
      console.warn('Failed to write layout to localStorage:', err);
    }

    api.saveAppConfig({
      user_id: tenantKey,
      settings: {
        autonomy: autonomyLevel,
        theme: theme,
        ui_lang: uiLang,
        layout: layoutConfig
      }
    }).catch(err => console.warn('Failed to sync layout config to server:', err));
  }, [minCenter, minSide, leftTab, chatInputHeight, agentWin, agentBtnWin, leftSideW, sideW, user, activeEntity, autonomyLevel, theme, uiLang]);

  // Restore saved layout on mount / user session load
  useEffect(() => {
    const tenantKey = user?.id || activeEntity || 'default_user';
    const localSaved = localStorage.getItem(`fabrica_layout_${tenantKey}`) || localStorage.getItem('fabrica_layout_global');
    if (localSaved) {
      try {
        const l = JSON.parse(localSaved);
        if (typeof l.minCenter === 'boolean') setMinCenter(l.minCenter);
        if (typeof l.minSide === 'boolean') setMinSide(l.minSide);
        if (l.leftTab) setLeftTab(l.leftTab);
        if (typeof l.chatInputHeight === 'number' && !isNaN(l.chatInputHeight)) setChatInputHeight(Math.max(96, l.chatInputHeight));
        if (typeof l.leftSideW === 'number' && !isNaN(l.leftSideW)) setLeftSideW(l.leftSideW);
        if (typeof l.sideW === 'number' && !isNaN(l.sideW)) setSideW(l.sideW);
        if (l.agentWin && typeof l.agentWin.w === 'number') setAgentWin(l.agentWin);
        if (l.agentBtnWin && typeof l.agentBtnWin.x === 'number') setAgentBtnWin(l.agentBtnWin);
      } catch (err) {
        console.warn('Failed to parse cached layout:', err);
      }
    }
  }, [user, activeEntity]);

  // Side Rail Drag Resizer Mechanics (Left & Right Column Widths)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingLeftRail) {
        const pct = Math.max(20, Math.min(45, Math.round((e.clientX / window.innerWidth) * 100)));
        setLeftSideW(pct);
      } else if (isDraggingRightRail) {
        const pct = Math.max(20, Math.min(42, Math.round(((window.innerWidth - e.clientX) / window.innerWidth) * 100)));
        setSideW(pct);
      }
    };

    const handleMouseUp = () => {
      if (isDraggingLeftRail) {
        setIsDraggingLeftRail(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        saveLayoutConfig(minCenter, minSide, leftTab, chatInputHeight, agentWin, agentBtnWin, leftSideW, sideW);
      }
      if (isDraggingRightRail) {
        setIsDraggingRightRail(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        saveLayoutConfig(minCenter, minSide, leftTab, chatInputHeight, agentWin, agentBtnWin, leftSideW, sideW);
      }
    };

    if (isDraggingLeftRail || isDraggingRightRail) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeftRail, isDraggingRightRail, minCenter, minSide, leftTab, chatInputHeight, agentWin, agentBtnWin, leftSideW, sideW, saveLayoutConfig]);

  // Mutually Exclusive Collapsing Logic
  // Rule 1: Vertical (Top Missions HQ vs Bottom Workspace). Only one can be minimized at a time.
  const toggleMissionsVertical = (targetMin?: boolean) => {
    const nextMin = targetMin !== undefined ? targetMin : !minCenter;
    if (nextMin) {
      setMinCenter(true);
      setMinBottomVertical(false);
      saveLayoutConfig(true, minSide);
    } else {
      setMinCenter(false);
      setMinPreviewState(false);
      setMinEditorState(false);
      saveLayoutConfig(false, minSide);
    }
  };

  const toggleBottomVertical = (targetMin?: boolean) => {
    const nextMin = targetMin !== undefined ? targetMin : !minBottomVertical;
    if (nextMin) {
      setMinBottomVertical(true);
      setMinCenter(false);
      saveLayoutConfig(false, minSide);
    } else {
      setMinBottomVertical(false);
      saveLayoutConfig(minCenter, minSide);
    }
  };

  // Rule 2: Horizontal (Bottom Left Artifact vs Bottom Right Projects). Only one can be minimized at a time.
  const toggleArtifactHorizontal = (targetMin?: boolean) => {
    const nextMin = targetMin !== undefined ? targetMin : !minArtifactSection;
    if (nextMin) {
      setMinArtifactSection(true);
      setMinSide(false);
      saveLayoutConfig(minCenter, false);
    } else {
      setMinArtifactSection(false);
      saveLayoutConfig(minCenter, minSide);
    }
  };

  const toggleProjectsHorizontal = (targetMin?: boolean) => {
    const nextMin = targetMin !== undefined ? targetMin : !minSide;
    if (nextMin) {
      setMinSide(true);
      setMinArtifactSection(false);
      saveLayoutConfig(minCenter, true);
    } else {
      setMinSide(false);
      saveLayoutConfig(minCenter, false);
    }
  };

  // Master grid column template (Left: Agent Section, Center: Missions & Workspace, Right: Live App Preview & Files)
  const getGridTemplateColumns = () => {
    const lw = `${leftSideW}%`;
    const sw = minSide ? '36px' : '270px';
    return `${lw} minmax(0, 1fr) ${sw}`;
  };

  // Agent Chat Input Height Resizer Drag Mechanics
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingChatInput) {
        const textareaEl = document.getElementById('agent-chat-textarea');
        if (textareaEl) {
          const rect = textareaEl.getBoundingClientRect();
          const newHeight = Math.max(28, Math.min(240, rect.bottom - e.clientY));
          setChatInputHeight(Math.round(newHeight));
        }
      }
    };

    const handleMouseUp = () => {
      if (isDraggingChatInput) {
        setIsDraggingChatInput(false);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
        saveLayoutConfig(minCenter, minSide, leftTab, chatInputHeight);
      }
    };

    if (isDraggingChatInput) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingChatInput, minCenter, minSide, leftTab, chatInputHeight, saveLayoutConfig]);

  // Event listener to automatically pop open Account & API window on API errors
  useEffect(() => {
    const handleOpenApiKeys = (e: Event) => {
      setIsAccountWindowOpen(true);
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.error) {
        setToast({
          message: `API Key required: ${customEvent.detail.error}`,
          type: 'warn',
          isOpen: true
        });
      } else {
        setToast({
          message: 'API Key required. Please configure your credentials.',
          type: 'warn',
          isOpen: true
        });
      }
    };
    window.addEventListener('fabrica:open-api-keys', handleOpenApiKeys);
    return () => window.removeEventListener('fabrica:open-api-keys', handleOpenApiKeys);
  }, []);

  // Sync UI language changes across all windows/selectors
  useEffect(() => {
    document.documentElement.setAttribute('dir', uiLang === 'AR' ? 'rtl' : 'ltr');
  }, [uiLang]);

  useEffect(() => {
    const handleSyncLang = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setUiLang(customEvt.detail);
      } else {
        const saved = (localStorage.getItem('fabrica_ui_lang') as 'EN' | 'FR' | 'AR') || 'EN';
        setUiLang(saved);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fabrica_ui_lang' && e.newValue) {
        setUiLang(e.newValue as 'EN' | 'FR' | 'AR');
      }
    };
    window.addEventListener('fabrica:ui-lang-change', handleSyncLang);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('fabrica:ui-lang-change', handleSyncLang);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleUiLangChange = (lang: 'EN' | 'FR' | 'AR') => {
    setUiLang(lang);
    localStorage.setItem('fabrica_ui_lang', lang);
    window.dispatchEvent(new CustomEvent('fabrica:ui-lang-change', { detail: lang }));
  };

  // Sync Agent language changes across all windows/selectors
  useEffect(() => {
    const handleSyncAgentLang = (e: Event) => {
      const customEvt = e as CustomEvent;
      if (customEvt.detail) {
        setAgentLang(customEvt.detail);
      } else {
        const saved = (localStorage.getItem('fabrica_agent_lang') as 'EN' | 'FR' | 'AR') || 'EN';
        setAgentLang(saved);
      }
    };
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'fabrica_agent_lang' && e.newValue) {
        setAgentLang(e.newValue as 'EN' | 'FR' | 'AR');
      }
    };
    window.addEventListener('fabrica:agent-lang-change', handleSyncAgentLang);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('fabrica:agent-lang-change', handleSyncAgentLang);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleAgentLangChange = (lang: 'EN' | 'FR' | 'AR') => {
    setAgentLang(lang);
    localStorage.setItem('fabrica_agent_lang', lang);
    window.dispatchEvent(new CustomEvent('fabrica:agent-lang-change', { detail: lang }));
    harnessApi.updateHarnessState({ agent_lang: lang, output_language: lang }).catch(() => {});
    // Plan 1.3: Language advisory — alert when switching to a non-English language
    if (lang !== 'EN') {
      const langLabel = lang === 'FR' ? 'French' : lang === 'AR' ? 'Arabic' : lang;
      setToast({
        message: `🌐 Agent language set to ${langLabel}. The agent will respond in ${langLabel} where possible. Response quality may vary by model and provider.`,
        type: 'info',
        isOpen: true
      });
    }
  };


  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('pb_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  useEffect(() => {
    let activeKey = '';
    if (chatModel.startsWith('openrouter/')) {
      activeKey = openrouterApiKey;
    } else if (chatModel.startsWith('anthropic/')) {
      activeKey = anthropicApiKey;
    } else {
      activeKey = geminiApiKey;
    }
    setCustomApiKey(activeKey);
    originalCustomApiKey.current = activeKey;
    setCustomApiKeyStatus('none');
  }, [chatModel, geminiApiKey, openrouterApiKey, anthropicApiKey]);

  useEffect(() => {
    loadRealModels(geminiApiKey, openrouterApiKey, anthropicApiKey);
  }, [geminiApiKey, openrouterApiKey, anthropicApiKey, backendKeys.gemini, backendKeys.openrouter, backendKeys.anthropic]);

  const EMPTY_ENTITY_DATA: EntityData = {
    board: "",
    runtime: {
      freshness: {
        last_edited: null,
        last_synced: "",
        sync_count: 0,
        sync_status: ""
      },
      metrics: {
        review_queue: 0,
        backlog: 0,
        pillars: { actives: 0, validated: 0, suggestions: 0 }
      },
      review_queue: [],
      backlog: [],
      pillars: {
        actives: [],
        suggestions: {},
        validated: { active: 0, total: 0 }
      },
      evolution_objectives: {
        actives: [],
        suggestions: {}
      },
      fill_queue: {},
      recent_events: []
    },
    missions: {
      standard: {},
      brainstorming: {},
      deep_research: {},
      analytics: {},
      system_build: {},
      system_build_from_data: {},
      system_optimization: {},
      system_optimization_from_data: {},
      system_test: {},
      system_test_from_data: {}
    } as any,
    toolboxes: {
      domains: {}
    } as any,
    inbox: {
      metrics: {
        raw_items: 0,
        gateway_items: 0,
        analysing_items: 0
      },
      discovery: [],
      raw: {},
      analysing: {},
      gateway: {}
    },
    prompts: {
      prompts: {}
    }
  };

  const EMPTY_ECOSYSTEM_DATA: EcosystemData = {
    entities: [],
    totals: {
      entities: 0,
      missions: 0,
      toolboxes_active: 0,
      inbox_raw: 0
    }
  };

  const getMergedEntityData = (entRes: any): EntityData => {
    if (!entRes) return EMPTY_ENTITY_DATA;

    return {
      board: entRes.board || "",
      runtime: {
        ...EMPTY_ENTITY_DATA.runtime,
        ...(entRes.runtime || {})
      },
      missions: {
        standard: {},
        brainstorming: {},
        deep_research: {},
        analytics: {},
        system_build: {},
        system_build_from_data: {},
        system_optimization: {},
        system_optimization_from_data: {},
        system_test: {},
        system_test_from_data: {},
        ...(entRes.missions || {})
      } as any,
      toolboxes: entRes.toolboxes || {} as any,
      inbox: entRes.inbox || EMPTY_ENTITY_DATA.inbox,
      prompts: entRes.prompts || EMPTY_ENTITY_DATA.prompts,
    };
  };

  const fetchWorkspaceData = async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [entRes, ecoRes, dbRaw, dbComp, projRes, wsMapRes] = await Promise.all([
        api.getEntity(activeEntity).catch(err => {
          console.warn('api.getEntity failed, using empty data fallback', err);
          return EMPTY_ENTITY_DATA;
        }),
        api.getEcosystem().catch(err => {
          console.warn('api.getEcosystem failed, using empty data fallback', err);
          return EMPTY_ECOSYSTEM_DATA;
        }),
        fetch(`/api/db/raw-data?tenantId=${encodeURIComponent(activeEntity || 'default_user')}`).then(r => r.json()).catch(() => []),
        fetch(`/api/db/system-components?tenantId=${encodeURIComponent(activeEntity || 'default_user')}`).then(r => r.json()).catch(() => []),
        api.getProjects(activeEntity).catch(() => ({ ok: false, projects: [] })),
        workspaceApi.getWorkspaceMap().catch(() => null),
      ]);
      if (wsMapRes && wsMapRes.ok && wsMapRes.map) {
        setWorkspaceMapData(wsMapRes.map);
      }
      const mergedEnt = getMergedEntityData(entRes);
      setEntityData(mergedEnt);
      if (mergedEnt.runtime && Array.isArray(mergedEnt.runtime.suggestions) && mergedEnt.runtime.suggestions.length > 0) {
        setAgentSuggestions(mergedEnt.runtime.suggestions);
      }
      setBoardContent(mergedEnt.board || '');
      setEcosystem(ecoRes && ecoRes.entities && ecoRes.entities.length > 0 ? ecoRes : EMPTY_ECOSYSTEM_DATA);
      setRawDataList(dbRaw || []);
      setSystemComponents(dbComp || []);
      setProjectsList(projRes?.projects || []);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to retrieve workspace data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const items: any[] = [];
    rawDataList.forEach((rd: any) => {
      items.push({
        id: `raw-${rd.id}`,
        dbId: rd.id,
        name: rd.name,
        type: 'raw_data',
        example: rd.mime_type || 'text/plain',
        desc: rd.content ? (rd.content.length > 100 ? rd.content.substring(0, 100) + '...' : rd.content) : 'No content snapshot.',
        status: rd.metadata?.status || 'new',
        linkedMissionId: rd.metadata?.linkedMissionId || ''
      });
    });

    systemComponents.forEach((sc: any) => {
      items.push({
        id: `sys-${sc.id}`,
        dbId: sc.id,
        name: sc.name,
        type: 'system',
        example: sc.role || 'service',
        desc: sc.code_snapshot ? (sc.code_snapshot.length > 100 ? sc.code_snapshot.substring(0, 100) + '...' : sc.code_snapshot) : 'No code snapshot.',
        status: sc.metadata?.status || sc.status || 'new',
        linkedMissionId: sc.metadata?.linkedMissionId || '',
        hasLegacy: !!sc.metadata?.legacy_code,
        legacyRef: sc.metadata?.legacy_code ? {
          version: 'v1.0 (Legacy)',
          date: new Date().toISOString().slice(0, 10),
          code: sc.metadata.legacy_code,
          enhancedCode: sc.code_snapshot
        } : undefined
      });
    });

    setEcomDataItems(items);
  }, [rawDataList, systemComponents]);

  const handleSemanticSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearchingSemantic(true);
    try {
      const res = await fetch(`/api/db/search?query=${encodeURIComponent(queryText)}&tenantId=${encodeURIComponent(activeEntity || 'default_user')}`);
      if (res.ok) {
        const data = await res.json();
        setSemanticSearchResults(data.results || []);
        setToast({ message: data.summary || 'Search complete!', type: 'success', isOpen: true });
      } else {
        const errData = await res.json();
        setToast({ message: `Search failed: ${errData.error}`, type: 'error', isOpen: true });
      }
    } catch (e: any) {
      console.error(e);
      setToast({ message: `Search failed: ${e.message}`, type: 'error', isOpen: true });
    } finally {
      setIsSearchingSemantic(false);
    }
  };

  const handleSysSemanticSearch = async (queryText: string) => {
    if (!queryText.trim()) return;
    setIsSearchingSysSemantic(true);
    try {
      const res = await fetch(`/api/db/search?query=${encodeURIComponent(queryText)}&tenantId=${encodeURIComponent(activeEntity || 'default_user')}`);
      if (res.ok) {
        const data = await res.json();
        setSysSemanticSearchResults(data.results || []);
        setToast({ message: data.summary || 'Systems search complete!', type: 'success', isOpen: true });
      } else {
        const errData = await res.json();
        setToast({ message: `Systems search failed: ${errData.error}`, type: 'error', isOpen: true });
      }
    } catch (e: any) {
      console.error(e);
      setToast({ message: `Systems search failed: ${e.message}`, type: 'error', isOpen: true });
    } finally {
      setIsSearchingSysSemantic(false);
    }
  };

  const handleAddRawData = async (name: string, content: string, initialMetadata?: any) => {
    try {
      const res = await fetch('/api/db/raw-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          content,
          mime_type: 'text/plain',
          metadata: {
            ...(initialMetadata || { status: 'new' }),
            tenantId: activeEntity || 'default_user'
          }
        })
      });
      if (res.ok) {
        setToast({ message: 'Raw data signal uploaded to database!', type: 'success', isOpen: true });
        fetchWorkspaceData();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteRawData = async (id: string) => {
    try {
      const res = await fetch(`/api/db/raw-data/${id}?tenantId=${encodeURIComponent(activeEntity || 'default_user')}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'Raw data deleted successfully!', type: 'success', isOpen: true });
        fetchWorkspaceData();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  // Google Workspace Handlers
  const handleGoogleSignIn = async () => {
    if (!supabase) {
      setToast({ message: 'Supabase is not configured yet.', type: 'error', isOpen: true });
      return;
    }
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly',
          redirectTo: typeof window !== 'undefined' ? window.location.origin + '/dashboard' : undefined
        }
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Google Sign-In failed: ${err.message}`, type: "error", isOpen: true });
    }
  };

  const handleGoogleLogout = async () => {
    try {
      if (supabase) {
        await supabase.auth.signOut();
      }
      setGoogleUser(null);
      setGoogleToken(null);
      setDriveFiles([]);
      setToast({ message: "Disconnected from Google Workspace.", type: "success", isOpen: true });
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Sign-Out failed: ${err.message}`, type: "error", isOpen: true });
    }
  };

  const fetchDriveFiles = async (token?: string) => {
    const activeToken = token || googleToken;
    if (!activeToken) return;
    setIsFetchingDrive(true);
    try {
      const files = await listDriveFiles(false);
      setDriveFiles(files);
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Failed to fetch Google Drive files: ${err.message}`, type: "error", isOpen: true });
    } finally {
      setIsFetchingDrive(false);
    }
  };

  const handleImportDriveFile = async (file: any) => {
    setIsImportingDriveFile(true);
    try {
      if (file.mimeType === 'application/vnd.google-apps.spreadsheet') {
        const result = await fetchGoogleSheetAsCSV(file.id);
        if (result.csv) {
          await handleAddRawData(`GoogleSheet_${result.title}_${result.sheetName}.csv`, result.csv);
          setToast({ message: `Successfully imported "${result.title}" spreadsheet values!`, type: "success", isOpen: true });
        } else {
          setToast({ message: "Spreadsheet is empty or could not be parsed.", type: "error", isOpen: true });
        }
      } else {
        const content = await fetchDriveFileContent(file.id, file.mimeType);
        await handleAddRawData(`GoogleDrive_${file.name}`, content);
        setToast({ message: `Successfully imported file "${file.name}"!`, type: "success", isOpen: true });
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Failed to import Google Workspace file: ${err.message}`, type: "error", isOpen: true });
    } finally {
      setIsImportingDriveFile(false);
    }
  };

  // GitHub Handlers
  const fetchGithubRepoContents = async () => {
    if (!githubOwner.trim() || !githubRepo.trim()) {
      setToast({ message: 'Please provide both GitHub owner and repository name', type: 'error', isOpen: true });
      return;
    }
    setIsFetchingGithub(true);
    setGithubFiles([]);
    setSelectedGithubFile(null);
    try {
      const contents = await fetchGitHubContents(githubOwner, githubRepo, githubPath, githubBranch, githubToken);
      setGithubFiles(contents);
      setToast({ message: `Loaded ${contents.length} items from GitHub!`, type: 'success', isOpen: true });
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Failed to fetch GitHub contents: ${err.message}`, type: 'error', isOpen: true });
    } finally {
      setIsFetchingGithub(false);
    }
  };

  const handleDownloadAndImportGithubFile = async (file: any) => {
    if (!file.download_url) {
      setToast({ message: 'This item is not a downloadable file.', type: 'error', isOpen: true });
      return;
    }
    try {
      const fileContent = await downloadGitHubFile(file.download_url, githubToken);
      const res = await fetch('/api/db/system-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          role: 'Submodule',
          code_snapshot: fileContent,
          metadata: { created_by: 'GitHub Import', status: 'new', tenantId: activeEntity || 'default_user', path: file.path }
        })
      });
      if (res.ok) {
        setToast({ message: `Successfully imported "${file.name}" as system component!`, type: 'success', isOpen: true });
        fetchWorkspaceData();
      } else {
        setToast({ message: 'Failed to register GitHub component in database.', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Failed to download file: ${err.message}`, type: 'error', isOpen: true });
    }
  };

  const handleExportSystemComponentToGithub = async () => {
    if (!githubExportTargetId) {
      setToast({ message: 'Please select a system component to export', type: 'error', isOpen: true });
      return;
    }
    if (!githubOwner.trim() || !githubRepo.trim() || !githubToken.trim() || !githubExportPath.trim()) {
      setToast({ message: 'Please fill owner, repository name, Personal Access Token (PAT), and target path', type: 'error', isOpen: true });
      return;
    }
    const comp = systemComponents.find((sc: any) => sc.id === githubExportTargetId);
    if (!comp) {
      setToast({ message: 'Component not found', type: 'error', isOpen: true });
      return;
    }
    setIsExportingGithub(true);
    try {
      const result = await exportToGitHub({
        owner: githubOwner,
        repo: githubRepo,
        path: githubExportPath,
        branch: githubBranch,
        token: githubToken,
        content: comp.code_snapshot || '',
        commitMessage: githubExportCommit
      });
      setToast({ message: `Successfully committed code back to GitHub! Commit SHA: ${result.sha.substring(0, 7)}`, type: 'success', isOpen: true });
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Failed to export component to GitHub: ${err.message}`, type: 'error', isOpen: true });
    } finally {
      setIsExportingGithub(false);
    }
  };

  const handleDownloadFilesAndFolders = async () => {
    if (!modalSubSectionContext) return;
    const { sectionType, subSectionKey, subSectionLabel, secItems } = modalSubSectionContext;
    const isSources = sectionType === 'sources';
    const currentSelectedIds = isSources ? exportSelectedSourceIds : exportSelectedDeliverableIds;
    const itemsToExport = (secItems || []).filter((item: any) => currentSelectedIds.includes(item.id));

    if (itemsToExport.length === 0) {
      setToast({ message: `Please select at least one item to export from ${subSectionLabel}`, type: 'error', isOpen: true });
      return;
    }

    try {
      if (itemsToExport.length === 1 && (!itemsToExport[0].metadata?.files || itemsToExport[0].metadata?.files.length === 0)) {
        // Direct single file download (files, not json)
        const singleItem = itemsToExport[0];
        const singleFileName = singleItem.name || `export_${subSectionKey}.txt`;
        const singleContent = singleItem.content || singleItem.code_snapshot || (typeof singleItem.data === 'string' ? singleItem.data : JSON.stringify(singleItem.data || singleItem, null, 2));

        const blob = new Blob([singleContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = singleFileName;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setToast({ message: `Downloaded file "${singleFileName}"!`, type: 'success', isOpen: true });
      } else {
        // Zip archive containing real files and folders (not json)
        const zip = new JSZip();

        for (const item of itemsToExport) {
          const itemProj = item.metadata?.project_name || item.metadata?.project || 'default_project';
          const sub = item.metadata?.sub_section || item.sub_section || subSectionKey;
          const fileName = item.name || `item_${item.id}`;
          const folderPath = `projects/${itemProj}/${sectionType}/${sub}`;

          const fileContent = item.content || item.code_snapshot || (typeof item.data === 'string' ? item.data : JSON.stringify(item.data || item, null, 2));

          if (item.metadata?.files && Array.isArray(item.metadata.files) && item.metadata.files.length > 0) {
            for (const f of item.metadata.files) {
              zip.file(`${folderPath}/${fileName}/${f.path || f.name}`, f.content || '');
            }
          } else {
            zip.file(`${folderPath}/${fileName}`, fileContent);
          }
        }

        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `fabrica_${sectionType}_${subSectionKey}_export.zip`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
        setToast({ message: `Downloaded ${itemsToExport.length} file(s) & folder(s) as ZIP archive!`, type: 'success', isOpen: true });
      }
    } catch (err: any) {
      console.error(err);
      setToast({ message: `Failed to download: ${err.message}`, type: 'error', isOpen: true });
    }
  };

  const handleAddSystemComponent = async () => {
    if (!newCompName.trim()) {
      setToast({ message: 'Please provide a system name', type: 'error', isOpen: true });
      return;
    }
    setIsAddingComp(true);
    try {
      const res = await fetch('/api/db/system-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompName,
          role: newCompRole,
          code_snapshot: newCompCode,
          metadata: { created_by: 'Operator', status: 'new', tenantId: activeEntity || 'default_user' }
        })
      });
      if (res.ok) {
        setToast({ message: 'System registered successfully!', type: 'success', isOpen: true });
        setNewCompName('');
        setNewCompCode('');
        fetchWorkspaceData();
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setIsAddingComp(false);
    }
  };

  const handleDeleteSystemComponent = async (id: string) => {
    try {
      const res = await fetch(`/api/db/system-components/${id}?tenantId=${encodeURIComponent(activeEntity || 'default_user')}`, { method: 'DELETE' });
      if (res.ok) {
        setToast({ message: 'System deleted!', type: 'success', isOpen: true });
        fetchWorkspaceData();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateRawDataStatus = async (item: any, newStatus: string) => {
    try {
      const res = await fetch('/api/db/raw-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          content: item.content,
          mime_type: item.mime_type || 'text/plain',
          metadata: {
            ...(item.metadata || {}),
            status: newStatus,
            tenantId: item.metadata?.tenantId || activeEntity || 'default_user'
          }
        })
      });
      if (res.ok) {
        setToast({ message: `Raw data status updated to ${newStatus.toUpperCase()}`, type: 'success', isOpen: true });
        fetchWorkspaceData();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateSystemComponentStatus = async (item: any, newStatus: string) => {
    try {
      const res = await fetch('/api/db/system-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          role: item.role,
          code_snapshot: item.code_snapshot,
          metadata: {
            ...(item.metadata || {}),
            status: newStatus,
            tenantId: item.metadata?.tenantId || activeEntity || 'default_user'
          }
        })
      });
      if (res.ok) {
        setToast({ message: `System status updated to ${newStatus.toUpperCase()}`, type: 'success', isOpen: true });
        fetchWorkspaceData();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleLinkAssetToMission = async (item: any, missionId: string) => {
    try {
      if (item.type === 'raw_data') {
        const realItem = rawDataList.find((rd: any) => rd.id === item.dbId);
        if (!realItem) return;
        const res = await fetch('/api/db/raw-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: realItem.id,
            name: realItem.name,
            content: realItem.content,
            mime_type: realItem.mime_type || 'text/plain',
            metadata: {
              ...(realItem.metadata || {}),
              linkedMissionId: missionId,
              tenantId: realItem.metadata?.tenantId || activeEntity || 'default_user'
            }
          })
        });
        if (res.ok) {
          setToast({
            message: missionId ? 'Asset linked to active mission!' : 'Asset unlinked from active mission',
            type: 'success',
            isOpen: true
          });
          fetchWorkspaceData();
        }
      } else {
        const realItem = systemComponents.find((sc: any) => sc.id === item.dbId);
        if (!realItem) return;
        const res = await fetch('/api/db/system-components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: realItem.id,
            name: realItem.name,
            role: realItem.role,
            code_snapshot: realItem.code_snapshot,
            metadata: {
              ...(realItem.metadata || {}),
              linkedMissionId: missionId,
              tenantId: realItem.metadata?.tenantId || activeEntity || 'default_user'
            }
          })
        });
        if (res.ok) {
          setToast({
            message: missionId ? 'Asset linked to active mission!' : 'Asset unlinked from active mission',
            type: 'success',
            isOpen: true
          });
          fetchWorkspaceData();
        }
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleUpdateSystemComponentCode = async (item: any, newCode: string, legacyCode?: string) => {
    try {
      const metadata = { 
        ...(item.metadata || {}),
        tenantId: item.metadata?.tenantId || activeEntity || 'default_user'
      };
      if (legacyCode !== undefined) {
        metadata.legacy_code = legacyCode;
      }
      const res = await fetch('/api/db/system-components', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          name: item.name,
          role: item.role,
          code_snapshot: newCode,
          metadata
        })
      });
      if (res.ok) {
        setToast({ message: 'System component code snapshot updated!', type: 'success', isOpen: true });
        fetchWorkspaceData();
      }
    } catch (e: any) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, [activeEntity]);

  useEffect(() => {
    // SSE Stream initialization
    const eventSource = new EventSource('/events');
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed && parsed.text) {
          setEvents((prev) => [parsed.text, ...prev.slice(0, 24)]);
        }
      } catch {
        setEvents((prev) => [event.data, ...prev.slice(0, 24)]);
      }
    };
    eventSource.onerror = () => {
      console.log("SSE channel disconnected; utilizing local fallback timeline.");
    };
    return () => {
      eventSource.close();
    };
  }, []);

  // Scroll chat window to bottom
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, agentWindowOpen]);

  // Save persistent markdown board
  const handleSaveBoard = async () => {
    setIsSavingBoard(true);
    try {
      const res = await api.updateBoard(activeEntity, boardContent);
      if (res.ok) {
        setIsEditingBoard(false);
        fetchWorkspaceData();
        setToast({
          message: 'Markdown board saved successfully!',
          type: 'success',
          isOpen: true
        });
      }
    } catch (err: any) {
      setToast({
        message: err.message || 'Error saving board notes.',
        type: 'error',
        isOpen: true
      });
    } finally {
      setIsSavingBoard(false);
    }
  };

  // Switch/patch mission state
  const handlePatchMission = async (category: string, missionId: string, nextClass: string) => {
    try {
      const path = [category, missionId, 'state', 'class'];
      const res = await api.patchEntity(activeEntity, 'missions', path, nextClass);
      if (res.ok) {
        fetchWorkspaceData();
        setToast({
          message: `Mission state class patched to ${nextClass}!`,
          type: 'success',
          isOpen: true
        });
        const targetM = (missions || []).find((m: any) => m.id === missionId) || { id: missionId, category };
        const updatedM = { ...targetM, state: { ...(targetM.state || {}), class: nextClass } };
        triggerMissionAgentNotification('MOVED', updatedM, `Patched mission state class to '${nextClass}'`);
      }
    } catch (err: any) {
      setToast({
        message: err.message || 'Error patching mission state class.',
        type: 'error',
        isOpen: true
      });
    }
  };

  const handleAutonomyChange = async (newLevel: 'off' | 'director' | 'worker') => {
    setAutonomyLevel(newLevel);
    localStorage.setItem('fabrica_autonomy_level', newLevel);
    setIsAutonomyOn(newLevel !== 'off');
    try {
      await api.saveAppConfig({
        user_id: activeEntity || 'default_user',
        settings: {
          autonomy: newLevel,
          notifications: {},
          sync_daemon: true
        }
      });
      await harnessApi.updateHarnessState({
        autonomy: newLevel,
        autonomy_interval: autonomyInterval
      }).catch(() => {});
      const label = newLevel === 'director' ? 'DIRECTOR' : newLevel === 'worker' ? 'WORKER' : 'OFF';
      setToast({ message: `Autonomy set to ${label}!`, type: 'success', isOpen: true });
      fetchWorkspaceData();
    } catch (err: any) {
      console.error('Failed to save autonomy config:', err);
    }
  };

  const handleUpdateMissionStatus = async (mission: any, nextStatus: string) => {
    try {
      let normalizedStatus = nextStatus;
      if (nextStatus === 'new' || nextStatus === 'draft') normalizedStatus = 'drafting';

      let nextClass = 'DRAFT';
      if (normalizedStatus === 'planning') nextClass = 'PLANNING';
      if (normalizedStatus === 'execution') nextClass = 'EXECUTION';
      if (normalizedStatus === 'archive' || normalizedStatus === 'done') nextClass = 'DONE';

      const cat = mission.type || mission.category || 'standard';
      let patchSuccess = false;
      try {
        await api.patchEntity(activeEntity, 'missions', [cat, mission.id, 'status'], normalizedStatus);
        const res = await api.patchEntity(activeEntity, 'missions', [cat, mission.id, 'state', 'class'], nextClass);
        if (res && res.ok) patchSuccess = true;
      } catch {
        // Fallback to saving directly in DB if patchEntity failed
      }

      // Also persist to JSON store to ensure persistent state transition across custom & preset missions
      await api.saveDbMission({
        ...mission,
        status: normalizedStatus,
        phase: normalizedStatus,
        state: {
          ...(mission.state || {}),
          class: nextClass
        }
      }).catch(() => null);

      setToast({ message: `Mission state updated to ${normalizedStatus.toUpperCase()}!`, type: 'success', isOpen: true });
      fetchWorkspaceData();
      const updatedMission = {
        ...mission,
        status: normalizedStatus,
        phase: normalizedStatus,
        state: {
          ...(mission.state || {}),
          class: nextClass
        }
      };
      setSelectedMission((prev: any) => {
        if (!prev || prev.id !== mission.id) return prev;
        return updatedMission;
      });
      triggerMissionAgentNotification('MOVED', updatedMission, `Moved mission status to '${normalizedStatus.toUpperCase()}' (${nextClass})`);
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to update status', type: 'error', isOpen: true });
    }
  };

  // Plan 4.2: Heartbeat — now a standalone function, driven by setTimeout after agent_end
  const runHeartbeat = async () => {
    if (!isAutonomyOn || autonomyLevel === 'off') return;
    if (isHeartbeatInFlightRef.current) return;

    // 1. Check Key/Credit
    const activeKey = geminiApiKey || customApiKey || (backendKeys && backendKeys.gemini ? 'backend' : '');
    if (!activeKey) {
      setHeartbeatStatus('no_key');
      setHeartbeatStatusText('Agent Heartbeat Paused: No Google AI Studio key or custom API key provided. Please configure key in Account & API.');
      return;
    }

    // 2. Check Context
    const hasMissions = Array.isArray(missions) && missions.length > 0;
    const hasRawData = Array.isArray(rawDataList) && rawDataList.length > 0;
    const hasSystems = Array.isArray(systemComponents) && systemComponents.length > 0;
    const hasObjective = Boolean(boardContent && boardContent.trim().length > 0);

    if (!hasMissions && !hasRawData && !hasSystems && !hasObjective) {
      setHeartbeatStatus('no_context');
      setHeartbeatStatusText('Agent Heartbeat Idle: User has not set any data sources, systems, or missions yet. Agent waiting for context.');
      return;
    }

    isHeartbeatInFlightRef.current = true;
    setIsHeartbeatRunning(true);
    setHeartbeatStatus('active');
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastHeartbeatTime(timeStr);
    setHeartbeatStatusText(`Agent Heartbeat Active • Last pulse at ${timeStr} • Key Validated • Agent evaluating context...`);

    try {
      const keyToUse = activeKey === 'backend' ? undefined : activeKey;
      const tenantKey = user?.id || activeEntity || 'default_user';

      const missionsSummary = (missions || []).slice(0, 10).map((m: any) => {
        const id = m.id || m.name;
        const title = m.title || m.name || m.id;
        const status = m.status || m.state?.class || 'DRAFT';
        const phase = m.phase || 'draft';
        return `• [ID: ${id}] "${title}" (Status: ${status}, Phase: ${phase})`;
      }).join('\n');

      const systemsSummary = (systemComponents || []).slice(0, 5).map((s: any) => `• System Component: ${s.name} (${s.role || 'Active'})`).join('\n');
      const rawDataSummary = (rawDataList || []).slice(0, 5).map((d: any) => `• Data Asset: ${d.name}`).join('\n');
      const lastSessionsSummary = (sessions || []).slice(-2).map((s: any, idx: number) => {
        const lastMsg = s.chatHistory && s.chatHistory.length > 0 ? s.chatHistory[s.chatHistory.length - 1].text?.slice(0, 150) : (s.lastPrompt || 'No messages');
        return `• Session ${idx + 1} (${s.name || s.id}): ${lastMsg}`;
      }).join('\n');

      const heartbeatPrompt = `[AUTONOMOUS AGENT HEARTBEAT CYCLE - ${timeStr}]
You are Fabrica's Autonomous AI Agent running in ${autonomyLevel === 'director' ? 'DIRECTOR (Full Auto)' : 'WORKER (Semi-Auto)'} mode.
Evaluate current workspace state and session logs, then decide if any mission or system needs your direct intervention.

CURRENT WORKSPACE CONTEXT:
- Active Tenant/Entity: ${tenantKey}
- Company Objective: ${boardContent || 'Build & optimize business software microservices'}
- Active Missions (${missions?.length || 0}):
${missionsSummary || 'None'}
- System Components (${systemComponents?.length || 0}):
${systemsSummary || 'None'}
- Raw Data Sources (${rawDataList?.length || 0}):
${rawDataSummary || 'None'}
- Recent Session Logs (Last 2 Sessions):
${lastSessionsSummary || 'None'}

AGENT DIRECTIVES:
1. Examine active missions and system state.
2. If you decide to advance a mission, include: ACTION: ADVANCE_MISSION id="<MISSION_ID>" targetStatus="<planning|execution|done>"
3. Keep your response brief, professional, and clear.`;

      const res = await api.chatAgent(heartbeatPrompt, [], keyToUse, chatModel, false, agentLang, activeSessionId, tenantKey, true);

      if (res && res.ok && res.text) {
        const agentText = res.text;

        const advanceMatch = agentText.match(/ACTION:\s*ADVANCE_MISSION\s+id=["']?([^"'\s]+)["']?\s+targetStatus=["']?([^"'\s]+)["']?/i);
        if (advanceMatch) {
          const targetId = advanceMatch[1];
          const targetStatus = advanceMatch[2].toLowerCase();
          const targetMission = (missions || []).find((m: any) => m.id === targetId || m.name === targetId);
          if (targetMission) {
            await handleUpdateMissionStatus(targetMission, targetStatus);
            setToast({
              message: `🤖 [AGENT HEARTBEAT] Agent advanced mission '${targetMission.title || targetMission.name}' to ${targetStatus.toUpperCase()}!`,
              type: 'success',
              isOpen: true
            });
          }
        }

        setChatHistory(prev => [
          ...prev,
          {
            sender: 'agent',
            text: `🤖 **[AUTONOMOUS HEARTBEAT ${timeStr}]**:\n${agentText}`
          }
        ]);

        fetchWorkspaceData();
        setHeartbeatStatusText(`Agent Heartbeat Active • Last pulse at ${timeStr} • Agent cycle completed.`);
      } else {
        setHeartbeatStatusText(`Agent Heartbeat Pulse at ${timeStr} • Standby.`);
      }
    } catch (err: any) {
      console.warn('Agent Heartbeat Error:', err);
      setHeartbeatStatusText(`Agent Heartbeat pulse completed with fallback at ${timeStr}`);
    } finally {
      setIsHeartbeatRunning(false);
      isHeartbeatInFlightRef.current = false;
    }
  };

  // Plan 4.2: Initial heartbeat check on autonomy mode change (no setInterval)
  useEffect(() => {
    if (!isAutonomyOn || autonomyLevel === 'off') {
      setHeartbeatStatus('testing');
      if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
      return;
    }
    runHeartbeat();
  }, [isAutonomyOn, autonomyLevel, activeEntity]);

  const handleUpdateMissionField = async (mission: any, fieldPath: string[], value: any) => {
    try {
      const path = [mission.type || mission.category || 'standard', mission.id, ...fieldPath];
      const res = await api.patchEntity(activeEntity, 'missions', path, value);
      if (res.ok) {
        setToast({ message: 'Mission field updated successfully!', type: 'success', isOpen: true });
        fetchWorkspaceData();
        setSelectedMission((prev: any) => {
          if (!prev || prev.id !== mission.id) return prev;
          const next = { ...prev };
          let target = next;
          for (let i = 0; i < fieldPath.length - 1; i++) {
            target[fieldPath[i]] = target[fieldPath[i]] || {};
            target = target[fieldPath[i]];
          }
          target[fieldPath[fieldPath.length - 1]] = value;
          return next;
        });
      }
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to update mission field', type: 'error', isOpen: true });
    }
  };

  const handleSaveQaState = async (mission: any, selection: string, customText: string, resolved: boolean) => {
    try {
      const nextQa = {
        options: mission.qa_state?.options || [
          "Approve and advance to execution planning",
          "Request deeper architectural analysis iteration",
          "Flag system blockages and pause execution"
        ],
        user_selection: selection,
        custom_input: customText,
        resolved: resolved
      };

      const path = [mission.type || mission.category || 'standard', mission.id, 'qa_state'];
      const res = await api.patchEntity(activeEntity, 'missions', path, nextQa);
      if (res.ok) {
        let updatedMission = { ...mission, qa_state: nextQa };

        const historyItem = {
          timestamp: new Date().toISOString(),
          phase: 'qa',
          status: `QA Assessment submitted: ${selection || 'No option selected'}. Custom Feedback: ${customText || 'None'}`
        };
        const nextHistory = [...(mission.workflow_history || []), historyItem];
        await api.patchEntity(activeEntity, 'missions', [mission.type || mission.category || 'standard', mission.id, 'workflow_history'], nextHistory);
        updatedMission.workflow_history = nextHistory;

        if (resolved) {
          let nextClass = 'PLANNING';
          if (selection && (selection.includes('Approve') || selection.includes('advance'))) {
            nextClass = 'PLANNING';
            await api.patchEntity(activeEntity, 'missions', [mission.type || mission.category || 'standard', mission.id, 'phase'], 'planning');
            updatedMission.phase = 'planning';
          } else if (selection && (selection.includes('Request') || selection.includes('deeper'))) {
            nextClass = 'DRAFT';
            await api.patchEntity(activeEntity, 'missions', [mission.type || mission.category || 'standard', mission.id, 'phase'], 'research_2');
            updatedMission.phase = 'research_2';
          } else {
            nextClass = 'DRAFT';
          }

          await api.patchEntity(activeEntity, 'missions', [mission.type || mission.category || 'standard', mission.id, 'state', 'class'], nextClass);
          updatedMission.state = { ...updatedMission.state, class: nextClass };
          updatedMission.status = nextClass === 'DONE' ? 'archive' : nextClass.toLowerCase();

          triggerMissionAgentNotification('MOVED', updatedMission, `QA Assessment completed (${selection}). Phase updated to '${updatedMission.phase}' (${nextClass})`);
        }

        setToast({ message: 'Assessment saved and business workflow aligned!', type: 'success', isOpen: true });
        fetchWorkspaceData();
        setSelectedMission(updatedMission);
      }
    } catch (e: any) {
      setToast({ message: e.message || 'Failed to save QA state', type: 'error', isOpen: true });
    }
  };

  const fetchAgentsMd = async () => {
    setIsLoadingAgentsMd(true);
    try {
      const res = await api.getAgentsMd();
      if (res.ok) {
        setAgentsMdContent(res.content || '');
        setAgentsMdPath(res.path || 'AGENTS.md');
      }
    } catch (err) {
      console.error("Failed to fetch AGENTS.md", err);
    } finally {
      setIsLoadingAgentsMd(false);
    }
  };

  const handleSaveAgentsMd = async () => {
    setIsSavingAgentsMd(true);
    try {
      const res = await api.saveAgentsMd(agentsMdContent);
      if (res.ok) {
        setToast({ message: 'AGENTS.md saved successfully! Directives updated.', type: 'success', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Failed to save AGENTS.md.', type: 'error', isOpen: true });
    } finally {
      setIsSavingAgentsMd(false);
    }
  };

  useEffect(() => {
    fetchAgentsMd();
  }, []);

  const fetchCliLogs = async () => {
    setIsFetchingCliLogs(true);
    try {
      const res = await fetch(`/api/pi/cli-logs?tenantId=${encodeURIComponent(activeEntity || 'default_user')}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.logs)) {
        setCliLogs(data.logs);
        if (data.logs.length > 0 && !selectedCliLog) {
          setSelectedCliLog(data.logs[0]);
        }
      }
    } catch (e) {
      console.error('Failed to fetch CLI process logs', e);
    } finally {
      setIsFetchingCliLogs(false);
    }
  };

  const handleRunCliCommand = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!cliTerminalInput.trim() || isCliRunning) return;
    const input = cliTerminalInput.trim();
    setCliTerminalInput('');
    setIsCliRunning(true);
    setCliTerminalOutput(prev => prev + `\n$ pi -p "${input}"\n[Spawning @paiml/pi-coding-agent child process...]\n`);
    try {
      const res = await fetch('/api/pi/cli-exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: input,
          tenantId: activeEntity || 'default_user',
          model: chatModel || 'google/gemini-3.6-flash'
        })
      });
      const data = await res.json();
      if (data.ok) {
        setCliTerminalOutput(prev => prev + `${data.text || '[No text response]'}\n[Child process finished - Tokens: ${data.usage?.totalTokens || 0}]\n`);
      } else {
        setCliTerminalOutput(prev => prev + `[CLI Process Error] ${data.error || data.text || 'Command execution failed'}\n`);
      }
      fetchCliLogs();
    } catch (err: any) {
      setCliTerminalOutput(prev => prev + `[Network Error] ${err.message}\n`);
    } finally {
      setIsCliRunning(false);
    }
  };

  const fetchUserLogs = async () => {
    setIsFetchingUserLogs(true);
    try {
      const res = await api.getWorkspaceLogs(activeEntity || 'default_user');
      if (res && res.ok && res.logs) {
        setUserLogsData(res.logs);
      }
    } catch (err) {
      console.warn('Failed to fetch user logs.json:', err);
    } finally {
      setIsFetchingUserLogs(false);
    }
  };

  useEffect(() => {
    if (isLogsWindowOpen) {
      if (activeLogTab === 'user_logs') {
        fetchUserLogs();
        const interval = setInterval(fetchUserLogs, 4000);
        return () => clearInterval(interval);
      }
      if (activeLogTab === 'cli') {
        fetchCliLogs();
        const interval = setInterval(fetchCliLogs, 3000);
        return () => clearInterval(interval);
      }
    }
  }, [isLogsWindowOpen, activeLogTab, activeEntity]);

  // Helper to safely merge arrays without duplicating or clearing existing items
  const mergeUniqueStrings = (existing: string[], incoming: string[]) => {
    const existingLower = new Set(existing.map(s => s.toLowerCase().trim()));
    const newItems = incoming.filter(item => Boolean(item) && !existingLower.has(item.toLowerCase().trim()));
    return [...existing, ...newItems];
  };

  // Modular AI Auto-Generate Specs Handler using REAL Agent API
  const handleAiAutoGenerateInputs = async (targetSection: string = 'all') => {
    setIsAiGeneratingInputs(true);
    try {
      const activeKey = geminiApiKey || (backendKeys.gemini ? undefined : customApiKey);
      const currentObj = newMissionObjective || 'Business & System Execution Mission';
      const cat = newMissionCategory || 'standard';

      // Construct request prompt for the Agent
      const promptText = `GENERATE_MISSION_SPECS targetSection="${targetSection}" category="${cat}" objective="${currentObj}".
You are the business systems AI Agent. Analyze the workspace context, active objective, category, and our conversation history.
Generate relevant, high-quality, professional specifications for section: "${targetSection}".

IMPORTANT: Respond ONLY with a valid JSON object matching this structure (no markdown fences, no conversational text):
{
  "goals": ["strategic goal 1", "strategic goal 2", "strategic goal 3"],
  "tasks": ["task_1: execution step 1", "task_2: execution step 2", "task_3: execution step 3"],
  "systems": ["target dataset or system 1", "target dataset or system 2"],
  "kpis": ["KPI metric 1", "KPI metric 2"],
  "dimensions": ["Segment dimension 1", "Segment dimension 2"],
  "research_topics": ["Research topic 1", "Research topic 2"],
  "research_sources": ["Research source 1", "Research source 2"],
  "brainstorm_themes": ["Creative theme 1", "Creative theme 2"],
  "brainstorm_constraints": ["Constraint 1", "Constraint 2"],
  "tech_stack": ["Tech stack spec 1", "Tech stack spec 2"],
  "target_paths": ["/frontend-next/app/dashboard/page.tsx", "server.ts"],
  "verification_gates": ["Unit Tests", "Compile Check"]
}`;

      // Format history to send to Agent
      const formattedHistory = chatHistory.map(h => ({
        sender: h.sender === 'user' ? 'user' : 'model',
        text: h.text
      }));

      // Call real Agent API with same model & chat history
      const res = await api.chatAgent(promptText, formattedHistory, activeKey, chatModel, webSearchEnabled, agentLang);

      let parsed: any = null;
      if (res && res.ok && res.text) {
        try {
          const jsonMatch = res.text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            parsed = JSON.parse(jsonMatch[0]);
          } else {
            parsed = JSON.parse(res.text);
          }
        } catch (e) {
          console.warn('[AI Spec Generator] Could not parse raw JSON from agent, applying structured text extractor');
        }
      }

      // If parsed successfully from real Agent response
      if (parsed) {
        if (targetSection === 'objective_text' || targetSection === 'all') {
          if (parsed.goals && Array.isArray(parsed.goals)) setNewStandardGoals(prev => mergeUniqueStrings(prev, parsed.goals));
          if (parsed.tasks && Array.isArray(parsed.tasks)) setNewStandardTasks(prev => mergeUniqueStrings(prev, parsed.tasks));
          if (parsed.systems && Array.isArray(parsed.systems)) setAnalyticsSelectedSystems(prev => mergeUniqueStrings(prev, parsed.systems));
          if (parsed.kpis && Array.isArray(parsed.kpis)) setAnalyticsSelectedKpis(prev => mergeUniqueStrings(prev, parsed.kpis));
          if (parsed.dimensions && Array.isArray(parsed.dimensions)) setAnalyticsSelectedDimensions(prev => mergeUniqueStrings(prev, parsed.dimensions));
          if (parsed.research_topics && Array.isArray(parsed.research_topics)) setResearchSelectedTopics(prev => mergeUniqueStrings(prev, parsed.research_topics));
          if (parsed.research_sources && Array.isArray(parsed.research_sources)) setResearchSelectedSources(prev => mergeUniqueStrings(prev, parsed.research_sources));
          if (parsed.brainstorm_themes && Array.isArray(parsed.brainstorm_themes)) setBrainstormSelectedThemes(prev => mergeUniqueStrings(prev, parsed.brainstorm_themes));
          if (parsed.brainstorm_constraints && Array.isArray(parsed.brainstorm_constraints)) setBrainstormSelectedConstraints(prev => mergeUniqueStrings(prev, parsed.brainstorm_constraints));
          if (parsed.tech_stack && Array.isArray(parsed.tech_stack)) setPipelineSelectedStack(prev => mergeUniqueStrings(prev, parsed.tech_stack));
          if (parsed.target_paths && Array.isArray(parsed.target_paths)) setPipelineSelectedPaths(prev => mergeUniqueStrings(prev, parsed.target_paths));
          if (parsed.verification_gates && Array.isArray(parsed.verification_gates)) setPipelineSelectedGates(prev => mergeUniqueStrings(prev, parsed.verification_gates));
        } else if (targetSection === 'goals' && parsed.goals) {
          setNewStandardGoals(prev => mergeUniqueStrings(prev, parsed.goals));
        } else if (targetSection === 'tasks' && parsed.tasks) {
          setNewStandardTasks(prev => mergeUniqueStrings(prev, parsed.tasks));
        } else if (targetSection === 'analytics_systems' && parsed.systems) {
          setAnalyticsSelectedSystems(prev => mergeUniqueStrings(prev, parsed.systems));
        } else if (targetSection === 'analytics_kpis' && parsed.kpis) {
          setAnalyticsSelectedKpis(prev => mergeUniqueStrings(prev, parsed.kpis));
        } else if (targetSection === 'analytics_dimensions' && parsed.dimensions) {
          setAnalyticsSelectedDimensions(prev => mergeUniqueStrings(prev, parsed.dimensions));
        } else if (targetSection === 'research_topics' && parsed.research_topics) {
          setResearchSelectedTopics(prev => mergeUniqueStrings(prev, parsed.research_topics));
        } else if (targetSection === 'research_sources' && parsed.research_sources) {
          setResearchSelectedSources(prev => mergeUniqueStrings(prev, parsed.research_sources));
        } else if (targetSection === 'brainstorm_themes' && parsed.brainstorm_themes) {
          setBrainstormSelectedThemes(prev => mergeUniqueStrings(prev, parsed.brainstorm_themes));
        } else if (targetSection === 'brainstorm_constraints' && parsed.brainstorm_constraints) {
          setBrainstormSelectedConstraints(prev => mergeUniqueStrings(prev, parsed.brainstorm_constraints));
        } else if (targetSection === 'system_stack' && parsed.tech_stack) {
          setPipelineSelectedStack(prev => mergeUniqueStrings(prev, parsed.tech_stack));
        } else if (targetSection === 'system_paths_gates') {
          if (parsed.target_paths) setPipelineSelectedPaths(prev => mergeUniqueStrings(prev, parsed.target_paths));
          if (parsed.verification_gates) setPipelineSelectedGates(prev => mergeUniqueStrings(prev, parsed.verification_gates));
        }
      } else {
        // High quality contextual fallback if API returns unstructured text or offline preview
        const textExcerpt = currentObj.trim().length > 5 ? currentObj.trim() : 'strategic objective';
        if (targetSection === 'goals' || targetSection === 'all' || targetSection === 'objective_text') {
          setNewStandardGoals(prev => mergeUniqueStrings(prev, [
            `Formulate strategic directive for ${textExcerpt.slice(0, 35)}...`,
            'Establish unambiguous operational milestones & schema rules',
            'Enforce strict verification gates & output compliance'
          ]));
        }
        if (targetSection === 'tasks' || targetSection === 'all' || targetSection === 'objective_text') {
          const nextIdx = newStandardTasks.length + 1;
          setNewStandardTasks(prev => mergeUniqueStrings(prev, [
            `task_${nextIdx}: Parse input specs & context requirements for ${textExcerpt.slice(0, 25)}`,
            `task_${nextIdx + 1}: Build core execution logic & state synchronization`,
            `task_${nextIdx + 2}: Synthesize build gates & verify zero errors`
          ]));
        }
        if (targetSection === 'analytics_systems' || targetSection === 'all') {
          setAnalyticsSelectedSystems(prev => mergeUniqueStrings(prev, ['ecom_orders_2026.csv', 'user_sessions_telemetry', 'stripe_invoices_db']));
        }
        if (targetSection === 'analytics_kpis' || targetSection === 'all') {
          setAnalyticsSelectedKpis(prev => mergeUniqueStrings(prev, ['Conversion Rate (%)', 'CAC (Customer Acquisition)', 'LTV (Lifetime Value)']));
        }
        if (targetSection === 'analytics_dimensions' || targetSection === 'all') {
          setAnalyticsSelectedDimensions(prev => mergeUniqueStrings(prev, ['Region / Geography', 'Cohort Signup Month', 'Device Type (Mobile/Desktop)']));
        }
        if (targetSection === 'research_topics' || targetSection === 'all') {
          setResearchSelectedTopics(prev => mergeUniqueStrings(prev, ['Competitive AI Agent Architecture Audit', 'Vector RAG Benchmarks', 'Multi-Agent Consensus Protocols']));
        }
        if (targetSection === 'research_sources' || targetSection === 'all') {
          setResearchSelectedSources(prev => mergeUniqueStrings(prev, ['ArXiv.org Research Papers', 'YouTube Tech Transcripts & Talks', 'GitHub Engineering Repos']));
        }
        if (targetSection === 'brainstorm_themes' || targetSection === 'all') {
          setBrainstormSelectedThemes(prev => mergeUniqueStrings(prev, ['Autonomous Workflow Automation', 'Generative UI & Dynamic Dashboards', 'Self-Healing Distributed Systems']));
        }
        if (targetSection === 'brainstorm_constraints' || targetSection === 'all') {
          setBrainstormSelectedConstraints(prev => mergeUniqueStrings(prev, ['Zero external SDK dependencies', '<100ms latency threshold', '100% Type-Safe']));
        }
        if (targetSection === 'system_stack' || targetSection === 'all') {
          setPipelineSelectedStack(prev => mergeUniqueStrings(prev, ['React 19 / Next.js 16', 'TypeScript 5.8', 'Tailwind CSS v4']));
        }
        if (targetSection === 'system_paths_gates' || targetSection === 'all') {
          setPipelineSelectedPaths(prev => mergeUniqueStrings(prev, ['/frontend-next/app/dashboard/page.tsx', 'server.ts']));
          setPipelineSelectedGates(prev => mergeUniqueStrings(prev, ['QA Unit Tests', 'TypeScript Compile Check', 'Build Synthesis']));
        }
      }

      // Also attach available extra sources
      const availableSources = getAvailableExtraSources();
      if (availableSources.length > 0) {
        setSelectedExtraSources(prev => mergeUniqueStrings(prev, availableSources.slice(0, 2).map(s => s.id)));
      }

      const activeModelLabel = chatModel || 'gemini-2.0-flash';
      setToast({
        message: `✨ Generated specs directly from Agent (${activeModelLabel}) with full chat context!`,
        type: 'success',
        isOpen: true
      });
    } catch (err: any) {
      console.error('[handleAiAutoGenerateInputs] Error:', err);
      setToast({ message: '✨ Synthesized inputs from agent context.', type: 'success', isOpen: true });
    } finally {
      setIsAiGeneratingInputs(false);
    }
  };

  // Create custom or preset mission and save in workspace missions YAML
  const handleCreateMission = async () => {
    if (!newMissionId.trim()) {
      setToast({ message: 'Please enter a unique mission ID.', type: 'error', isOpen: true });
      return;
    }
    if (!newMissionObjective.trim()) {
      setToast({ message: 'Please enter a mission objective.', type: 'error', isOpen: true });
      return;
    }

    // format ID to snake_case / alphanumeric
    const formattedId = newMissionId
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/_+/g, '_');

    setIsAddingMission(true);
    try {
      // Determine initial phase based on launcher mode
      let initialPhase = 'discovery_scoping';
      if (launcherModelType === 'quick_pipeline') {
        initialPhase = quickStartPhase;
      } else if (launcherModelType === 'custom_entry_pipeline') {
        initialPhase = customEntryPhase;
      } else if (launcherModelType === 'custom_selection_pipeline') {
        const enabled = Object.keys(selectedPipelinePhases).filter(k => selectedPipelinePhases[k]);
        initialPhase = enabled[0] || 'discovery_scoping';
      } else if (launcherModelType === 'full_pipeline') {
        initialPhase = 'discovery_scoping';
      } else {
        const stepsForCat = getStepsForCategory(newMissionCategory);
        initialPhase = stepsForCat && stepsForCat.length > 0 ? stepsForCat[0].key : 'discovery_scoping';
      }

      // Build category-specific custom inputs payload
      const customInputsPayload: Record<string, any> = {
        pipeline_mode: launcherModelType
      };
      let initialGoalsDict: Record<string, any> = {};
      let initialTasksDict: Record<string, any> = {};

      if (launcherModelType === 'quick_pipeline') {
        customInputsPayload.quick_start_phase = quickStartPhase;
        customInputsPayload.start_phase = quickStartPhase;
        customInputsPayload.tech_stack = pipelineSelectedStack.join(', ');
        customInputsPayload.target_path = pipelineSelectedPaths.join(', ');
        customInputsPayload.selected_stack_list = pipelineSelectedStack;
        customInputsPayload.selected_paths_list = pipelineSelectedPaths;
      } else if (launcherModelType === 'custom_entry_pipeline') {
        customInputsPayload.custom_entry_phase = customEntryPhase;
        customInputsPayload.start_phase = customEntryPhase;
        customInputsPayload.tech_stack = pipelineSelectedStack.join(', ');
        customInputsPayload.target_path = pipelineSelectedPaths.join(', ');
        customInputsPayload.selected_stack_list = pipelineSelectedStack;
        customInputsPayload.selected_paths_list = pipelineSelectedPaths;
      } else if (launcherModelType === 'custom_selection_pipeline') {
        const enabledPhases = Object.keys(selectedPipelinePhases).filter(k => selectedPipelinePhases[k]);
        customInputsPayload.selected_pipeline_phases = enabledPhases;
        customInputsPayload.enabled_phases_list = enabledPhases;
        customInputsPayload.tech_stack = pipelineSelectedStack.join(', ');
        customInputsPayload.target_path = pipelineSelectedPaths.join(', ');
        customInputsPayload.selected_stack_list = pipelineSelectedStack;
        customInputsPayload.selected_paths_list = pipelineSelectedPaths;
      }

      // Bind Extra Sources / Prior Outputs Context
      if (selectedExtraSources.length > 0) {
        customInputsPayload.extra_sources = selectedExtraSources.join(' | ');
        customInputsPayload.selected_extra_sources = selectedExtraSources;
      }

      if (newMissionCategory === 'standard') {
        customInputsPayload.goals_list = newStandardGoals;
        customInputsPayload.tasks_list = newStandardTasks;
        newStandardGoals.forEach((g, i) => {
          initialGoalsDict[`goal_${i + 1}`] = { id: `goal_${i + 1}`, label: g, status: false };
        });
        newStandardTasks.forEach((t, i) => {
          initialTasksDict[`task_${i + 1}`] = { id: `task_${i + 1}`, label: t, progress: 'not-started' };
        });
      } else if (newMissionCategory === 'analytics') {
        customInputsPayload.target_dataset = analyticsSelectedSystems.join(', ');
        customInputsPayload.kpi_metrics = analyticsSelectedKpis.join(', ');
        customInputsPayload.dimensions = analyticsSelectedDimensions.join(', ');
        customInputsPayload.selected_systems_list = analyticsSelectedSystems;
        customInputsPayload.selected_kpis_list = analyticsSelectedKpis;
        customInputsPayload.selected_dimensions_list = analyticsSelectedDimensions;
      } else if (newMissionCategory === 'deep_research') {
        customInputsPayload.research_topic = researchSelectedTopics.join(', ');
        customInputsPayload.target_sources = researchSelectedSources.join(', ');
        customInputsPayload.source_type = researchSourceType;
        customInputsPayload.research_depth = newResearchDepth;
        customInputsPayload.search_grounding = researchSourceType !== 'llm';
        customInputsPayload.youtube_research_enabled = researchSourceType === 'youtube' || researchSourceType === 'web_youtube';
        customInputsPayload.selected_topics_list = researchSelectedTopics;
        customInputsPayload.selected_sources_list = researchSelectedSources;
      } else if (newMissionCategory === 'brainstorming') {
        customInputsPayload.creative_brief = brainstormSelectedThemes.join(', ');
        customInputsPayload.thinking_framework = brainstormFramework;
        customInputsPayload.constraints = brainstormSelectedConstraints.join(', ');
        customInputsPayload.selected_themes_list = brainstormSelectedThemes;
        customInputsPayload.selected_constraints_list = brainstormSelectedConstraints;
      } else if (newMissionCategory.startsWith('system_')) {
        customInputsPayload.build_mode = systemBuildMode;
        customInputsPayload.fresh_build_from_scratch = newMissionCategory === 'system_build' || systemBuildMode === 'scratch';
        customInputsPayload.tech_stack = pipelineSelectedStack.join(', ');
        customInputsPayload.target_path = pipelineSelectedPaths.join(', ');
        customInputsPayload.verification_gates = pipelineSelectedGates.join(', ');
        customInputsPayload.selected_stack_list = pipelineSelectedStack;
        customInputsPayload.selected_paths_list = pipelineSelectedPaths;
        customInputsPayload.selected_gates_list = pipelineSelectedGates;
      }

      const missionCategoryToUse = launcherModelType === 'standard' ? 'standard' : 'system_build';

      // Create mission object matching exact YAML schema:
      const missionObj = {
        model: 'standard',
        category: missionCategoryToUse,
        type: launcherModelType,
        objective: newMissionObjective,
        priority: newMissionPriority,
        phase: initialPhase,
        status: 'drafting',
        created_by: 'user',
        user_created: true,
        last_progress_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
        state: {
          status: true,
          class: 'DRAFT',
          progress: 'in-progress'
        },
        inputs: customInputsPayload,
        rounds: {
          status: false,
          persistent: false,
          max: 1
        },
        metrics: {
          goals: Object.keys(initialGoalsDict).length,
          progress_percentage: '0%',
          tasks: Object.keys(initialTasksDict).length,
          round_progress_percentage: '0%',
          round: 1
        },
        runtime: {
          recent_events: [
            `${new Date().toISOString().replace(/\.\d+Z$/, 'Z')} [System] Mission created via Fabrica UI.`
          ],
          review_queue: [],
          backlog: []
        },
        goals: initialGoalsDict,
        tasks: initialTasksDict
      };

      // Path setup
      const path = [newMissionCategory, formattedId];

      try {
        await missionsApi.createMission(formattedId, newMissionObjective, newMissionCategory);
      } catch (mErr) {
        console.warn('Direct missionsApi create call notice:', mErr);
      }

      const res = await api.patchEntity(activeEntity, 'missions', path, missionObj);
      if (res.ok) {
        setIsAddMissionOpen(false);
        // Reset form
        setNewMissionId('');
        setNewMissionObjective('');
        setNewMissionCategory('standard');
        setNewMissionPriority('HIGH');
        setSelectedExtraSources([]);
        setExtraSourcesCustomInput('');
        fetchWorkspaceData();

        // Select the new mission so user can edit parameters in the NEW section immediately
        const createdMission = { id: formattedId, category: newMissionCategory, type: newMissionCategory, ...missionObj };
        setSelectedMission(createdMission);

        setToast({
          message: `Mission "${formattedId}" added to workspace! Notifying Agent...`,
          type: 'success',
          isOpen: true
        });

        triggerMissionAgentNotification('ADDED', createdMission, `Added via UI in category '${newMissionCategory}' with priority '${newMissionPriority}'`);
      } else {
        setToast({ message: 'Failed to register new mission in workspace.', type: 'error', isOpen: true });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Error occurred while creating mission.', type: 'error', isOpen: true });
    } finally {
      setIsAddingMission(false);
    }
  };

  // Recursive directory tree traversal helper
  const traverseFileSystemEntry = async (entry: any, path = ''): Promise<{ file: File; relativePath: string }[]> => {
    return new Promise((resolve) => {
      if (!entry) return resolve([]);
      if (entry.isFile) {
        entry.file(
          (file: File) => {
            const relativePath = path ? `${path}/${file.name}` : (file.webkitRelativePath || file.name);
            resolve([{ file, relativePath }]);
          },
          () => resolve([])
        );
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        let entries: any[] = [];
        const readEntries = () => {
          dirReader.readEntries(
            async (results: any[]) => {
              if (!results || results.length === 0) {
                const nestedPromises = entries.map((e) =>
                  traverseFileSystemEntry(e, path ? `${path}/${entry.name}` : entry.name)
                );
                const nestedFiles = await Promise.all(nestedPromises);
                resolve(nestedFiles.flat());
              } else {
                entries = entries.concat(Array.from(results));
                readEntries();
              }
            },
            () => resolve([])
          );
        };
        readEntries();
      } else {
        resolve([]);
      }
    });
  };

  const extractFilesFromDragEvent = async (e: React.DragEvent<HTMLDivElement>): Promise<{ file: File; relativePath: string }[]> => {
    const items = e.dataTransfer?.items;
    if (items && items.length > 0) {
      const promises: Promise<{ file: File; relativePath: string }[] >[] = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            promises.push(traverseFileSystemEntry(entry));
          } else {
            const file = item.getAsFile();
            if (file) {
              promises.push(Promise.resolve([{ file, relativePath: file.webkitRelativePath || file.name }]));
            }
          }
        }
      }
      if (promises.length > 0) {
        const results = await Promise.all(promises);
        const flattened = results.flat();
        if (flattened.length > 0) return flattened;
      }
    }

    const filesList: { file: File; relativePath: string }[] = [];
    if (e.dataTransfer?.files) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const f = e.dataTransfer.files[i];
        filesList.push({ file: f, relativePath: f.webkitRelativePath || f.name });
      }
    }
    return filesList;
  };

  const extractFilesFromFileList = (fileList: FileList | null): { file: File; relativePath: string }[] => {
    if (!fileList || fileList.length === 0) return [];
    const results: { file: File; relativePath: string }[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const f = fileList[i];
      results.push({
        file: f,
        relativePath: f.webkitRelativePath || f.name
      });
    }
    return results;
  };

  // Drag-and-drop raw data ingestion handler (supports files and folders)
  const handleFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const items = await extractFilesFromDragEvent(e);
    if (items && items.length > 0) {
      await processRawDataBatch(items);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const items = extractFilesFromFileList(e.target.files);
    if (items && items.length > 0) {
      await processRawDataBatch(items);
    }
    e.target.value = '';
  };

  // Drag-and-drop system file/folder ingestion handler
  const handleSystemFileDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const items = await extractFilesFromDragEvent(e);
    if (items && items.length > 0) {
      await processSystemComponentBatch(items);
    }
  };

  const handleSystemFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const items = extractFilesFromFileList(e.target.files);
    if (items && items.length > 0) {
      await processSystemComponentBatch(items);
    }
    e.target.value = '';
  };

  const processSystemComponentBatch = async (items: { file: File; relativePath: string }[]) => {
    if (!items || items.length === 0) return;

    const validItems = items.filter(it => {
      const path = it.relativePath.toLowerCase();
      return !path.includes('/node_modules/') && !path.includes('/.git/') && !path.includes('/dist/') && !path.includes('/.next/') && !path.startsWith('.');
    });

    if (validItems.length === 0) {
      setSystemUploadStatus('error');
      setSystemUploadProgress('No valid system files found in selection.');
      return;
    }

    setSystemUploadStatus('uploading');

    if (validItems.length === 1) {
      const single = validItems[0];
      setSystemUploadProgress(`Processing system file ${single.relativePath}...`);
      try {
        const text = await single.file.text();
        const baseName = single.file.name.replace(/\.[^/.]+$/, "");

        const res = await fetch('/api/db/system-components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: baseName,
            role: 'Uploaded System Component',
            code_snapshot: text,
            metadata: { created_by: 'Operator', status: 'new', uploaded_file: single.relativePath, tenantId: activeEntity || 'default_user' }
          })
        });

        if (res.ok) {
          setSystemUploadStatus('success');
          setSystemUploadProgress(`Successfully uploaded and registered ${single.relativePath}!`);
          fetchWorkspaceData();
          setToast({
            message: `Uploaded system ${single.relativePath} successfully!`,
            type: 'success',
            isOpen: true
          });
        } else {
          setSystemUploadStatus('error');
          setSystemUploadProgress('Error: System component registration failed.');
          setToast({ message: 'System registration failed.', type: 'error', isOpen: true });
        }
      } catch (err: any) {
        setSystemUploadStatus('error');
        setSystemUploadProgress(err.message || 'Failed to read file.');
        setToast({ message: err.message || 'Failed to read file.', type: 'error', isOpen: true });
      }
    } else {
      // Import folder/codebase as a system component
      const rootFolder = validItems[0].relativePath.split('/')[0] || 'imported_system';
      setSystemUploadProgress(`Reading ${validItems.length} codebase files from folder '${rootFolder}'...`);

      try {
        const fileContents: { path: string; text: string }[] = [];
        for (let i = 0; i < validItems.length; i++) {
          const it = validItems[i];
          setSystemUploadProgress(`Reading system folder file (${i + 1}/${validItems.length}): ${it.relativePath}...`);
          try {
            const text = await it.file.text();
            fileContents.push({ path: it.relativePath, text });
          } catch (e) {
            console.error('Failed reading file in system folder', it.relativePath, e);
          }
        }

        let consolidatedSnapshot = `// ==========================================\n// SYSTEM COMPONENT FOLDER: ${rootFolder}\n// Total Files: ${fileContents.length}\n// ==========================================\n\n`;
        fileContents.forEach(fc => {
          consolidatedSnapshot += `// --- FILE: ${fc.path} ---\n${fc.text}\n\n`;
        });

        const res = await fetch('/api/db/system-components', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: rootFolder,
            role: 'Uploaded System Component Folder',
            code_snapshot: consolidatedSnapshot,
            metadata: {
              created_by: 'Operator',
              status: 'new',
              is_folder: true,
              folder_name: rootFolder,
              total_files: fileContents.length,
              file_tree: fileContents.map(fc => fc.path),
              tenantId: activeEntity || 'default_user'
            }
          })
        });

        if (res.ok) {
          setSystemUploadStatus('success');
          setSystemUploadProgress(`Successfully registered system folder '${rootFolder}' (${fileContents.length} files bundled)!`);
          fetchWorkspaceData();
          setToast({
            message: `Uploaded system folder '${rootFolder}' successfully!`,
            type: 'success',
            isOpen: true
          });
        } else {
          setSystemUploadStatus('error');
          setSystemUploadProgress('Error: Registration failed.');
          setToast({ message: 'System folder registration failed.', type: 'error', isOpen: true });
        }
      } catch (err: any) {
        setSystemUploadStatus('error');
        setSystemUploadProgress(err.message || 'Failed to read system folder.');
        setToast({ message: err.message || 'Failed to read system folder.', type: 'error', isOpen: true });
      }
    }
  };

  const processRawDataBatch = async (items: { file: File; relativePath: string }[]) => {
    if (!items || items.length === 0) return;

    const validItems = items.filter(it => {
      const name = it.file.name.toLowerCase();
      return !name.startsWith('.') && name !== 'thumbs.db' && !it.relativePath.includes('/.git/');
    });

    if (validItems.length === 0) {
      setUploadStatus('error');
      setUploadProgress('No valid readable data files found in selection.');
      return;
    }

    setUploadStatus('uploading');

    if (validItems.length === 1) {
      const single = validItems[0];
      setUploadProgress(`Processing ${single.relativePath}...`);
      try {
        const text = await single.file.text();
        await handleAddRawData(single.relativePath, text);

        const res = await api.uploadDiscovery(text, single.file.name, chatModel);
        if (res.ok) {
          setUploadStatus('success');
          setUploadProgress(`Successfully processed ${single.relativePath}! Found ${res.result.missions?.length || 0} missions.`);
          const applyRes = await api.applyRoadmap(activeEntity, res.result.missions, res.result.pillars);
          if (applyRes.ok) {
            setUploadProgress(`Roadmap applied into ${activeEntity.toUpperCase()}`);
            fetchWorkspaceData();
            setToast({
              message: `Ingested specs from ${single.relativePath} successfully!`,
              type: 'success',
              isOpen: true
            });
          }
        } else {
          setUploadStatus('success');
          setUploadProgress(`Added data source ${single.relativePath}.`);
          fetchWorkspaceData();
          setToast({ message: `Ingested ${single.relativePath} as Raw Data Source!`, type: 'success', isOpen: true });
        }
      } catch (err: any) {
        setUploadStatus('error');
        setUploadProgress(err.message || 'Failed to ingest local file specification.');
        setToast({ message: err.message || 'Failed to ingest local file specification.', type: 'error', isOpen: true });
      }
    } else {
      let successCount = 0;
      const total = validItems.length;
      let combinedSnippets = '';

      for (let i = 0; i < total; i++) {
        const item = validItems[i];
        setUploadProgress(`Ingesting folder data (${i + 1}/${total}): ${item.relativePath}...`);
        try {
          const text = await item.file.text();
          await handleAddRawData(item.relativePath, text);
          successCount++;
          if (combinedSnippets.length < 15000) {
            combinedSnippets += `\n--- File: ${item.relativePath} ---\n` + text.slice(0, 2000);
          }
        } catch (e) {
          console.error('Failed file read', item.relativePath, e);
        }
      }

      if (combinedSnippets.trim()) {
        try {
          const folderName = validItems[0].relativePath.split('/')[0] || 'Imported Folder';
          const res = await api.uploadDiscovery(combinedSnippets, folderName, chatModel);
          if (res.ok && res.result.missions?.length) {
            await api.applyRoadmap(activeEntity, res.result.missions, res.result.pillars);
          }
        } catch (e) {
          // non-blocking
        }
      }

      setUploadStatus('success');
      setUploadProgress(`Successfully ingested folder: ${successCount} of ${total} files saved to Raw Data Sources!`);
      fetchWorkspaceData();
      setToast({ message: `Imported folder with ${successCount} files into Raw Data Sources!`, type: 'success', isOpen: true });
    }
  };

  // Mission Event Queue for non-interruptive real-time Agent notifications
  const missionEventQueueRef = useRef<Array<{ action: 'ADDED' | 'MOVED'; mission: any; extraInfo?: string }>>([]);

  const processMissionEvent = async (action: 'ADDED' | 'MOVED', mission: any, extraInfo?: string) => {
    const isDirector = autonomyLevel === 'director' || (typeof isAutonomyOn !== 'undefined' && isAutonomyOn && autonomyLevel !== 'worker' && autonomyLevel !== 'off');
    const modeStr = isDirector ? 'DIRECTOR (Autonomous Mode)' : 'WORKER (Interactive / Semi-Autonomous Mode)';

    const missionTitle = mission.title || mission.objective || mission.id || 'Untitled Mission';
    const missionId = mission.id || 'N/A';
    const missionCategory = mission.category || mission.type || 'standard';
    const missionPhase = mission.phase || mission.status || mission.state?.class || 'DRAFT';

    const eventLogText = `[MISSION ${action}] ID: ${missionId} | Title: "${missionTitle}" | Category: ${missionCategory} | Phase: ${missionPhase} | Mode: ${modeStr}${extraInfo ? ` | ${extraInfo}` : ''}`;

    try {
      await harnessApi.appendUserAction('missions_actions', eventLogText);
    } catch (err) {
      console.warn('Failed logging mission action:', err);
    }

    try {
      await api.appendAuditLog(eventLogText, 'mission', missionId);
    } catch (_) {}
  };

  const triggerMissionAgentNotification = (action: 'ADDED' | 'MOVED', mission: any, extraInfo?: string) => {
    if (isChatLoading) {
      missionEventQueueRef.current.push({ action, mission, extraInfo });
      setToast({
        message: `⚡ Mission ${action} queued for Agent review after active turn.`,
        type: 'info',
        isOpen: true
      });
    } else {
      processMissionEvent(action, mission, extraInfo);
    }
  };

  // Agent Stop trigger
  const handleStopChat = async () => {
    // Guard against accidental double-trigger from mouseup/click on swapped button
    if (Date.now() - lastSendTimeRef.current < 600) {
      console.log('[handleStopChat] Ignored stop request triggered immediately after send');
      return;
    }
    if (chatAbortControllerRef.current) {
      try {
        chatAbortControllerRef.current.abort();
      } catch (_) {}
      chatAbortControllerRef.current = null;
    }
    const tenantKey = user?.id || activeEntity || 'default_user';
    try {
      await api.stopAgent(tenantKey, activeSessionId);
    } catch (_) {}
    setIsChatLoading(false);
    setChatHistory(prev => [...prev, { sender: 'agent', text: '🛑 **[Agent turn stopped by user]**' }]);
    setToast({ message: 'Agent turn stopped.', type: 'info', isOpen: true });
  };

  // Agent Chat trigger
  const handleSendChat = async (msgOverride?: string) => {
    let msg = (msgOverride || chatMessage).trim();
    if (!msg) {
      if (contextPickerAttachedItems.length === 0) return;
      msg = 'Evaluate attached context items and assist.';
    }

    // Plan 1.1-B: Attach extra context items to prompt
    if (contextPickerAttachedItems.length > 0) {
      const contextBlock = contextPickerAttachedItems.map(item =>
        item.path ? `@${item.path}` : `[ATTACHED ${item.type.toUpperCase()}: ${item.label}]\n${item.content}`
      ).join('\n\n');
      msg = `${contextBlock}\n\n${msg}`;
      setContextPickerAttachedItems([]);
    }

    lastSendTimeRef.current = Date.now();
    setChatMessage('');
    setIsChatLoading(true);

    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    const userMessage = { sender: 'user' as const, text: msg };
    const agentMessage = { sender: 'agent' as const, text: '' };

    const formattedHistory = chatHistory.map(h => ({
      sender: h.sender === 'user' ? 'user' : 'model',
      text: h.text
    }));

    setChatHistory(prev => [...prev, userMessage, agentMessage]);

    try {
      const tenantKey = user?.id || activeEntity || 'default_user';
      const activeCustomKey = customApiKey && customApiKey.trim().length > 0 ? customApiKey.trim() : undefined;

      let accumulatedStreamText = '';
      let res: any;

      if (isStreamingEnabled) {
        res = await api.chatAgentStream(
          msg,
          formattedHistory,
          activeCustomKey,
          chatModel,
          webSearchEnabled,
          agentLang,
          activeSessionId,
          tenantKey,
          true,
          controller.signal,
          thinkingLevel,
          (chunkData: any) => {
            if (typeof chunkData.delta === 'string') {
              accumulatedStreamText += chunkData.delta;
            } else if (chunkData.type === 'message' && typeof chunkData.content === 'string') {
              accumulatedStreamText += chunkData.content;
            } else if (chunkData.type === 'thinking' && typeof chunkData.content === 'string') {
              // Optional thinking stream tracking
            } else if (chunkData.type === 'turn_end' && chunkData.message) {
              const content = chunkData.message.content;
              if (typeof content === 'string') accumulatedStreamText = content;
              else if (Array.isArray(content)) {
                accumulatedStreamText = content.filter((c: any) => c.type === 'text').map((c: any) => c.text).join('\n');
              }
              if (chunkData.message.usage) {
                const inT = chunkData.message.usage.input || 0;
                const outT = chunkData.message.usage.output || 0;
                const total = inT + outT;
                const maxT = chunkData.message.usage.contextWindow || 200000;
                setPiContext({
                  tokensUsed: total,
                  maxTokens: maxT,
                  percentUsed: Math.min(100, Math.round((total / maxT) * 100))
                });
              }
            } else if (typeof chunkData.text === 'string' && chunkData.text.length > 0) {
              if (chunkData.text.length >= accumulatedStreamText.length) {
                accumulatedStreamText = chunkData.text;
              } else if (accumulatedStreamText === '') {
                accumulatedStreamText = chunkData.text;
              } else {
                accumulatedStreamText += chunkData.text;
              }
            }

            if (accumulatedStreamText) {
              setChatHistory(prev => {
                const updated = [...prev];
                const lastIdx = updated.length - 1;
                if (lastIdx >= 0 && updated[lastIdx].sender === 'agent') {
                  updated[lastIdx] = { sender: 'agent', text: accumulatedStreamText };
                } else {
                  updated.push({ sender: 'agent', text: accumulatedStreamText });
                }
                return updated;
              });
            }
          }
        );
      } else {
        res = await api.chatAgent(
          msg,
          formattedHistory,
          activeCustomKey,
          chatModel,
          webSearchEnabled,
          agentLang,
          activeSessionId,
          tenantKey,
          true,
          controller.signal,
          thinkingLevel
        );
        if (res && res.ok && res.text) {
          accumulatedStreamText = res.text;
          setChatHistory(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].sender === 'agent') {
              updated[lastIdx] = { sender: 'agent', text: res.text };
            } else {
              updated.push({ sender: 'agent', text: res.text });
            }
            return updated;
          });
          if (res.usage) {
            const inT = res.usage.input || 0;
            const outT = res.usage.output || 0;
            const total = inT + outT;
            const maxT = res.usage.contextWindow || 200000;
            setPiContext({
              tokensUsed: total,
              maxTokens: maxT,
              percentUsed: Math.min(100, Math.round((total / maxT) * 100))
            });
          }
        }
      }

      fetchUserTierData();
      if (res.ok) {
        const finalText = accumulatedStreamText || res.text || '';
        if (finalText) {
          setChatHistory(prev => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (lastIdx >= 0 && updated[lastIdx].sender === 'agent') {
              updated[lastIdx] = { sender: 'agent', text: finalText };
            } else {
              updated.push({ sender: 'agent', text: finalText });
            }
            return updated;
          });
        }
        const lowerText = (finalText || '').toLowerCase();
        if (
          lowerText.includes('no key') ||
          lowerText.includes('api key') ||
          lowerText.includes('offline preview mode') ||
          lowerText.includes('please supply') ||
          lowerText.includes('not configured') ||
          lowerText.includes('invalid key') ||
          lowerText.includes('quota')
        ) {
          setIsAccountWindowOpen(true);
          setToast({ message: 'API Key notice: Opening settings...', type: 'warn', isOpen: true });
        }
      } else {
        const errorMsg = res.text || res.error || 'Connection lost or API service unavailable. Ensure your API Key is configured in settings.';
        setChatHistory(prev => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].sender === 'agent') {
            updated[lastIdx] = { sender: 'agent', text: errorMsg };
          } else {
            updated.push({ sender: 'agent', text: errorMsg });
          }
          return updated;
        });
        if (errorMsg.toLowerCase().includes('key') || errorMsg.toLowerCase().includes('card') || errorMsg.toLowerCase().includes('setting')) {
          setIsAccountWindowOpen(true);
          setToast({ message: 'API Key or configuration required. Opening settings...', type: 'warn', isOpen: true });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return;
      }
      const errText = err.message || 'Check connection settings.';
      setChatHistory(prev => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (lastIdx >= 0 && updated[lastIdx].sender === 'agent') {
          updated[lastIdx] = { sender: 'agent', text: `Failed to stream response: ${errText}` };
        } else {
          updated.push({ sender: 'agent', text: `Failed to stream response: ${errText}` });
        }
        return updated;
      });
      setIsAccountWindowOpen(true);
      setToast({ message: `Agent API Error: ${errText}`, type: 'error', isOpen: true });
    } finally {
      chatAbortControllerRef.current = null;
      setIsChatLoading(false);
      const tenantKey = user?.id || activeEntity || 'default_user';
      refreshPiContext(tenantKey, activeSessionId);
      await fetchWorkspaceData();
      await runPostTurnAutomations();

      // Read updated suggestions from harness.json after agent turn completes
      try {
        const harnessState = await harnessApi.getHarnessState(tenantKey);
        if (harnessState?.harness?.suggestions && Array.isArray(harnessState.harness.suggestions) && harnessState.harness.suggestions.length > 0) {
          setAgentSuggestions(harnessState.harness.suggestions);
        } else if (harnessState?.suggestions && Array.isArray(harnessState.suggestions) && harnessState.suggestions.length > 0) {
          setAgentSuggestions(harnessState.suggestions);
        }
      } catch (_) {}

      // Dequeue queued mission event if any after turn ends
      if (missionEventQueueRef.current.length > 0) {
        const nextEvent = missionEventQueueRef.current.shift();
        if (nextEvent) {
          setTimeout(() => {
            processMissionEvent(nextEvent.action, nextEvent.mission, nextEvent.extraInfo);
          }, 400);
        }
      }

      // Plan 4.2: Schedule next heartbeat via setTimeout after agent_end
      if (isAutonomyOn && autonomyLevel !== 'off') {
        const intervalMs = Math.max(20000, (autonomyInterval || 20) * 1000);
        if (heartbeatTimeoutRef.current) clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = setTimeout(() => { runHeartbeat(); }, intervalMs);
      }
    }
  };

  const handleSaveGeminiKey = (key: string) => {
    setGeminiKeyStatus('saving');
    setGeminiApiKey(key);
    localStorage.setItem('pb_gemini_key', key);
    originalGeminiKey.current = key;
    if (!chatModel.startsWith('openrouter/') && !chatModel.startsWith('anthropic/')) {
      setCustomApiKey(key);
      originalCustomApiKey.current = key;
      setCustomApiKeyStatus('none');
    }
    setGeminiKeyStatus('saved');
    setToast({
      message: 'Google AI Studio Key saved successfully!',
      type: 'success',
      isOpen: true
    });
  };

  const handleClearGeminiKey = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Gemini Key',
      message: 'Are you sure you want to clear your Google AI Studio API Key from local storage?',
      confirmText: 'Clear',
      isDestructive: true,
      onConfirm: () => {
        setGeminiApiKey('');
        localStorage.removeItem('pb_gemini_key');
        originalGeminiKey.current = '';
        if (!chatModel.startsWith('openrouter/') && !chatModel.startsWith('anthropic/')) {
          setCustomApiKey('');
          originalCustomApiKey.current = '';
          setCustomApiKeyStatus('none');
        }
        setGeminiKeyStatus('none');
        setConfirmModal(null);
        setToast({
          message: 'Gemini API Key cleared.',
          type: 'info',
          isOpen: true
        });
      }
    });
  };

  const handleSaveOpenRouterKey = (key: string) => {
    setOpenrouterKeyStatus('saving');
    setOpenrouterApiKey(key);
    localStorage.setItem('pb_openrouter_key', key);
    originalOpenrouterKey.current = key;
    if (chatModel.startsWith('openrouter/')) {
      setCustomApiKey(key);
      originalCustomApiKey.current = key;
      setCustomApiKeyStatus('none');
    }
    setOpenrouterKeyStatus('saved');
    setToast({
      message: 'OpenRouter API Key saved successfully!',
      type: 'success',
      isOpen: true
    });
  };

  const handleClearOpenRouterKey = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear OpenRouter Key',
      message: 'Are you sure you want to clear your OpenRouter API Key from local storage?',
      confirmText: 'Clear',
      isDestructive: true,
      onConfirm: () => {
        setOpenrouterApiKey('');
        localStorage.removeItem('pb_openrouter_key');
        originalOpenrouterKey.current = '';
        if (chatModel.startsWith('openrouter/')) {
          setCustomApiKey('');
          originalCustomApiKey.current = '';
          setCustomApiKeyStatus('none');
        }
        setOpenrouterKeyStatus('none');
        setConfirmModal(null);
        setToast({
          message: 'OpenRouter API Key cleared.',
          type: 'info',
          isOpen: true
        });
      }
    });
  };

  const handleSaveAnthropicKey = (key: string) => {
    setAnthropicKeyStatus('saving');
    setAnthropicApiKey(key);
    localStorage.setItem('pb_anthropic_key', key);
    originalAnthropicKey.current = key;
    if (chatModel.startsWith('anthropic/')) {
      setCustomApiKey(key);
      originalCustomApiKey.current = key;
      setCustomApiKeyStatus('none');
    }
    setAnthropicKeyStatus('saved');
    setToast({
      message: 'Anthropic Claude Key saved successfully!',
      type: 'success',
      isOpen: true
    });
  };

  const handleClearAnthropicKey = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Anthropic Key',
      message: 'Are you sure you want to clear your Anthropic API Key from local storage?',
      confirmText: 'Clear',
      isDestructive: true,
      onConfirm: () => {
        setAnthropicApiKey('');
        localStorage.removeItem('pb_anthropic_key');
        originalAnthropicKey.current = '';
        if (chatModel.startsWith('anthropic/')) {
          setCustomApiKey('');
          originalCustomApiKey.current = '';
          setCustomApiKeyStatus('none');
        }
        setAnthropicKeyStatus('none');
        setConfirmModal(null);
        setToast({
          message: 'Anthropic Key cleared.',
          type: 'info',
          isOpen: true
        });
      }
    });
  };

  const handleSaveApiKey = (key: string) => {
    setCustomApiKeyStatus('saving');
    setCustomApiKey(key);
    localStorage.setItem('pb_gemini_key', key);
    setGeminiApiKey(key);
    originalGeminiKey.current = key;
    originalCustomApiKey.current = key;
    setCustomApiKeyStatus('saved');
    setToast({
      message: 'API Key saved successfully!',
      type: 'success',
      isOpen: true
    });
  };

  const handleClearApiKey = () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Saved Credentials',
      message: 'Are you sure you want to clear your saved API Key from local storage?',
      confirmText: 'Clear',
      isDestructive: true,
      onConfirm: () => {
        setCustomApiKey('');
        localStorage.removeItem('pb_gemini_key');
        setGeminiApiKey('');
        originalCustomApiKey.current = '';
        originalGeminiKey.current = '';
        setCustomApiKeyStatus('none');
        setGeminiKeyStatus('none');
        setConfirmModal(null);
        setToast({
          message: 'Credentials cleared.',
          type: 'info',
          isOpen: true
        });
      }
    });
  };

  const downloadLogs = () => {
    const text = events.join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `fabrica-logs-${new Date().toISOString().slice(0,10)}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const maskedKey = customApiKey && customApiKey.length > 0
    ? `${customApiKey.slice(0, 6)}...${customApiKey.slice(-4)}`
    : '';

  const getMaskedKey = (key: string) => {
    return key && key.length > 0 ? `${key.slice(0, 6)}...${key.slice(-4)}` : '';
  };

  const handleModelChange = (model: string) => {
    setChatModel(model);
    localStorage.setItem('pb_chat_model', model);
  };

  useEffect(() => {
    const isGeminiConfigured = !!geminiApiKey || backendKeys.gemini;
    const isOpenRouterConfigured = !!openrouterApiKey || backendKeys.openrouter;
    const isAnthropicConfigured = !!anthropicApiKey || backendKeys.anthropic;

    const isCurrentModelOk = 
      (chatModel.startsWith('openrouter/') && isOpenRouterConfigured) ||
      (chatModel.startsWith('anthropic/') && isAnthropicConfigured) ||
      (!chatModel.startsWith('openrouter/') && !chatModel.startsWith('anthropic/') && isGeminiConfigured);

    if (!isCurrentModelOk) {
      if (isGeminiConfigured) {
        setChatModel('gemini-3.6-flash');
      } else if (isOpenRouterConfigured) {
        setChatModel('openrouter/meta-llama/llama-3.3-70b-instruct:free');
      } else if (isAnthropicConfigured) {
        setChatModel('anthropic/claude-3-5-sonnet-latest');
      }
    }
  }, [geminiApiKey, openrouterApiKey, anthropicApiKey, backendKeys, chatModel]);

  const modelMetadata: Record<string, { provider: string; limit: string; cost: string; desc: string }> = {
    'gemini-3.6-flash': {
      provider: 'Google AI Studio',
      limit: '15 RPM / 1M TPB / 1500 RPD (Free)',
      cost: '100% Free via AI Studio',
      desc: 'Google flagship Gemini 3.6 Flash model. Ultra-fast, highly intelligent, and optimized for complex reasoning.'
    },
    'gemini-2.0-flash': {
      provider: 'Google AI Studio',
      limit: '15 RPM / 1M TPB / 1500 RPD (Free)',
      cost: '100% Free via AI Studio',
      desc: 'Latest standard Gemini 2.0 fast model. Highly responsive, excellent for general task handling.'
    },
    'gemini-2.0-flash-lite': {
      provider: 'Google AI Studio',
      limit: '15 RPM / 1M TPB (Free)',
      cost: '100% Free via AI Studio',
      desc: 'Gemini 2.0 Flash-Lite. Ultra-fast, cost-efficient, and optimized for low-latency tasks.'
    },
    'gemini-2.0-pro-exp-02-05': {
      provider: 'Google AI Studio',
      limit: '2 RPM / 50 RPD (Free)',
      cost: '100% Free via AI Studio',
      desc: 'Gemini 2.0 Pro Experimental. Top-tier intelligence for complex reasoning, planning, and coding.'
    },
    'gemini-1.5-flash': {
      provider: 'Google AI Studio',
      limit: '15 RPM / 1M TPB (Free)',
      cost: '100% Free via AI Studio',
      desc: 'Stable legacy fast model. Extremely versatile.'
    },
    'gemini-1.5-pro': {
      provider: 'Google AI Studio',
      limit: '2 RPM / 1M TPB (Free)',
      cost: '100% Free via AI Studio',
      desc: 'Stable legacy high-analytical model for large contexts.'
    },
    'openrouter/meta-llama/llama-3.3-70b-instruct:free': {
      provider: 'OpenRouter (Meta)',
      limit: 'Dynamic free rate limits',
      cost: '100% Free Tier',
      desc: 'Meta LLaMA 3.3 70B Instruct. SOTA open source model with strong logical and formatting precision.'
    },
    'openrouter/nousresearch/hermes-3-llama-3.1-405b:free': {
      provider: 'OpenRouter (Nous)',
      limit: 'Dynamic free rate limits',
      cost: '100% Free Tier',
      desc: 'Nous Hermes 3 Llama 3.1 405B. A state-of-the-art open-weights model fine-tuned for high steerability and roleplay.'
    },
    'openrouter/nousresearch/hermes-3-llama-3.1-8b:free': {
      provider: 'OpenRouter (Nous)',
      limit: 'Dynamic free rate limits',
      cost: '100% Free Tier',
      desc: 'Nous Hermes 3 Llama 3.1 8B. Lightweight, highly steerable instruction-tuned model.'
    },
    'openrouter/deepseek/deepseek-r1:free': {
      provider: 'OpenRouter (DeepSeek)',
      limit: 'Dynamic free rate limits',
      cost: '100% Free Tier',
      desc: 'DeepSeek R1 Distill model. Advanced chain-of-thought reasoning for complex problem solving.'
    },
    'openrouter/deepseek/deepseek-chat': {
      provider: 'OpenRouter (DeepSeek)',
      limit: 'Paid: High rate limits',
      cost: 'Ultra Low Cost (~$0.14 per 1M tokens)',
      desc: 'DeepSeek V3 chat model. Extremely capable model for code generation and multi-perspective planning.'
    },
    'openrouter/google/gemini-2.0-flash': {
      provider: 'OpenRouter (Google)',
      limit: 'Varies by OpenRouter availability',
      cost: 'Proxy cost',
      desc: 'Access Google Gemini 2.0 Flash through the OpenRouter multi-key proxy.'
    },
    'openrouter/google/gemini-1.5-pro': {
      provider: 'OpenRouter (Google)',
      limit: 'Varies by OpenRouter availability',
      cost: 'Proxy cost',
      desc: 'Access Google Gemini 1.5 Pro through OpenRouter.'
    },
    'anthropic/claude-3-5-sonnet-latest': {
      provider: 'Anthropic Direct',
      limit: 'Paid: Determined by account tier',
      cost: 'Input: $3.00/M | Output: $15.00/M',
      desc: 'Claude 3.5 Sonnet. Supreme programming, deep logical reasoning, and architectural plan generation.'
    },
    'anthropic/claude-3-5-haiku-latest': {
      provider: 'Anthropic Direct',
      limit: 'Paid: Determined by account tier',
      cost: 'Input: $0.80/M | Output: $4.00/M',
      desc: 'Claude 3.5 Haiku. The fastest Claude model, ideal for rapid iterations and highly precise formatting.'
    },
    'anthropic/claude-3-opus-latest': {
      provider: 'Anthropic Direct',
      limit: 'Paid: Determined by account tier',
      cost: 'Input: $15.00/M | Output: $75.00/M',
      desc: 'Claude 3 Opus. Highly creative, deep context synthesis and literary capability.'
    }
  };

  const renderModelOptions = () => {
    if (tokenBillingMode === 'pool') {
      return (
        <optgroup label="🏊 Fabrica System Pool (Free Tier)" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
          {FABRICA_POOL_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </optgroup>
      );
    }

    const providers = buildProvidersFromPiCli(piModelsList);

    const activeProviders = providers.filter((prov) => {
      if (showOnlyFree) {
        return prov.id === 'google' || prov.id === 'openrouter' || prov.id === 'groq';
      }
      return true;
    });

    return (
      <>
        {(tokenBillingMode === 'managed' || tokenBillingMode === 'paug') && (
          <option value="managed">⚡ Auto System Routed (Managed)</option>
        )}
        {(!activeProviders || activeProviders.length === 0) ? (
          <option value="gemini-3.6-flash">
            google/gemini-3.6-flash (Agent CLI Default)
          </option>
        ) : (
          activeProviders.map((prov) => (
            <optgroup
              key={prov.id}
              label={`${prov.name} — [${prov.badge}]`}
              style={{ background: 'var(--surface)', color: 'var(--text)' }}
            >
              {prov.models.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name || m.id}
                </option>
              ))}
            </optgroup>
          ))
        )}
      </>
    );
  };

  // Draggable mouse mechanics
  const startDragAgentBtn = (e: React.MouseEvent) => {
    const startX = e.clientX - agentBtnWin.x;
    const startY = e.clientY - agentBtnWin.y;
    const handleMouseMove = (mvEvent: MouseEvent) => {
      setAgentBtnWin({
        x: mvEvent.clientX - startX,
        y: mvEvent.clientY - startY
      });
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const startDragAgent = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('select')) {
      return;
    }
    const startX = e.clientX - agentWin.x;
    const startY = e.clientY - agentWin.y;
    const handleMouseMove = (mvEvent: MouseEvent) => {
      setAgentWin(prev => ({
        ...prev,
        x: mvEvent.clientX - startX,
        y: mvEvent.clientY - startY
      }));
    };
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Quick suggestion prompts
  const suggestions = [
    'Synthesize strategic SWOT analysis',
    'Audit tool tree activations',
    'Ingest support signal from workspace',
    'Analyze current workspace backlog'
  ];

  const pbSuggestionsMap = {
    EN: [
      {
        title: 'Summarize Backlog',
        icon: '📋',
        prompt: 'Generate a clear, prioritized executive summary of our active backlog items, including strategic pillars and objectives.',
        desc: 'Get a prioritized audit of current tasks.'
      },
      {
        title: 'Alignment Audit',
        icon: '🎯',
        prompt: 'Perform a workspace alignment audit. Are my active missions aligned with our registered pillars and objectives?',
        desc: 'Check if goals and missions are synced.'
      },
      {
        title: 'Recommend Mission',
        icon: '💡',
        prompt: 'Analyze my current workspace state and suggest a high-impact McKinsey-inspired mission to add next.',
        desc: 'Suggest strategic next steps.'
      },
      {
        title: 'List Tools',
        icon: '🛠️',
        prompt: 'Let\'s explore my available toolboxes and custom skills. Summarize what tools are ready.',
        desc: 'Check system skills & custom tools.'
      }
    ],
    FR: [
      {
        title: 'Résumer le Backlog',
        icon: '📋',
        prompt: 'Générez un résumé exécutif clair et priorisé de nos éléments de backlog actifs, y compris les piliers stratégiques.',
        desc: 'Obtenez un audit priorisé des tâches actuelles.'
      },
      {
        title: 'Audit d\'Alignement',
        icon: '🎯',
        prompt: 'Effectuez un audit d\'alignement de l\'espace de travail. Mes missions actives sont-elles alignées avec nos piliers ?',
        desc: 'Vérifiez si les objectifs et missions sont synchronisés.'
      },
      {
        title: 'Recommander Mission',
        icon: '💡',
        prompt: 'Analysez l\'état actuel de mon espace de travail et suggérez une mission stratégique à fort impact à ajouter.',
        desc: 'Suggérer des étapes stratégiques.'
      },
      {
        title: 'Lister les Outils',
        icon: '🛠️',
        prompt: 'Explorons mes boîtes à outils disponibles et compétences personnalisées. Résumez les outils prêts.',
        desc: 'Vérifier les compétences et outils.'
      }
    ],
    AR: [
      {
        title: 'تلخيص المهام',
        icon: '📋',
        prompt: 'قم بإنشاء ملخص تنفيذي واضح بأسقية العناصر في قائمة المهام النشطة، بما في ذلك الركائز والأهداف الإستراتيجية.',
        desc: 'الحصول على تدقيق أولويات المهام الحالية.'
      },
      {
        title: 'تدقيق التوافق',
        icon: '🎯',
        prompt: 'قم بإجراء تدقيق توافق لمساحة العمل. هل مهامي النشطة متوافقة مع الركائز والأهداف المسجلة؟',
        desc: 'التحقق من تزامن الأهداف والمهام.'
      },
      {
        title: 'توصية بمهمة',
        icon: '💡',
        prompt: 'حلل حالة مساحة العمل الحالية واقترح مهمة إستراتيجية عالية الأثر لإضافتها بعد ذلك.',
        desc: 'اقتراح الخطوات الإستراتيجية التالية.'
      },
      {
        title: 'قائمة الأدوات',
        icon: '🛠️',
        prompt: 'دعنا نستكشف صناديق الأدوات والمهارات المخصصة المتاحة لدي. لخص الأدوات الجاهزة للاستخدام.',
        desc: 'التحقق من المهارات والأدوات.'
      }
    ]
  };

  const pbSuggestions = pbSuggestionsMap[agentLang] || pbSuggestionsMap.EN;

  const parseInlineMarkdown = (text: string) => {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} style={{ fontWeight: 800, color: 'var(--text)' }}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code key={index} style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--border-soft)',
            padding: '1px 4px',
            borderRadius: '4px',
            fontFamily: 'var(--mono)',
            fontSize: '8.5px',
            color: 'var(--accent-2)',
            wordBreak: 'break-all'
          }}>
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const renderChatMessage = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
        const language = match ? match[1] : '';
        const code = match ? match[2].trim() : part.slice(3, -3).trim();

        return (
          <div key={index} style={{
            background: '#0a0f1d',
            border: '1.5px solid var(--border)',
            borderRadius: '6px',
            margin: '8px 0',
            fontFamily: 'var(--mono)',
            fontSize: '8.5px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            width: '100%'
          }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              padding: '4px 8px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#94a3b8'
            }}>
              <span style={{ fontSize: '7.5px', textTransform: 'uppercase', fontWeight: 800, letterSpacing: '0.05em' }}>{language || 'code'}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(code);
                  setToast({
                    message: 'Copied code to clipboard!',
                    type: 'success',
                    isOpen: true
                  });
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: '8px',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}
              >
                📋 COPY CODE
              </button>
            </div>
            <pre style={{
              margin: 0,
              padding: '8px',
              overflowX: 'auto',
              color: '#f8fafc',
              lineHeight: 1.4,
              whiteSpace: 'pre'
            }}>{code}</pre>
          </div>
        );
      }

      const lines = part.split('\n');
      return (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '3px', width: '100%' }}>
          {lines.map((line, lineIdx) => {
            const trimmed = line.trim();

            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              const content = trimmed.substring(2);
              const indent = line.search(/\S/);
              return (
                <div key={lineIdx} style={{
                  display: 'flex',
                  gap: '6px',
                  paddingLeft: `${8 + indent * 2}px`,
                  alignItems: 'flex-start',
                  margin: '1px 0'
                }}>
                  <span style={{ color: 'var(--accent)', fontSize: '7px', marginTop: '4px' }}>■</span>
                  <span style={{ flex: 1, fontSize: '9.5px', lineHeight: 1.4 }}>{parseInlineMarkdown(content)}</span>
                </div>
              );
            }

            const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
              const num = numMatch[1];
              const content = numMatch[2];
              const indent = line.search(/\S/);
              return (
                <div key={lineIdx} style={{
                  display: 'flex',
                  gap: '6px',
                  paddingLeft: `${8 + indent * 2}px`,
                  alignItems: 'flex-start',
                  margin: '1px 0'
                }}>
                  <span style={{ color: 'var(--accent)', fontSize: '8.5px', fontWeight: 800, fontFamily: 'var(--mono)' }}>{num}.</span>
                  <span style={{ flex: 1, fontSize: '9.5px', lineHeight: 1.4 }}>{parseInlineMarkdown(content)}</span>
                </div>
              );
            }

            if (trimmed.startsWith('### ')) {
              return (
                <h5 key={lineIdx} style={{
                  margin: '8px 0 4px',
                  fontSize: '10px',
                  fontWeight: 900,
                  color: 'var(--accent-2)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.02em'
                }}>
                  {parseInlineMarkdown(trimmed.substring(4))}
                </h5>
              );
            }
            if (trimmed.startsWith('## ') || trimmed.startsWith('# ')) {
              const level = trimmed.startsWith('## ') ? 2 : 1;
              return (
                <h4 key={lineIdx} style={{
                  margin: '10px 0 4px',
                  fontSize: level === 1 ? '11.5px' : '10.5px',
                  fontWeight: 900,
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  borderBottom: level === 1 ? '1.5px solid var(--border-soft)' : 'none',
                  paddingBottom: '2px',
                  letterSpacing: '0.03em'
                }}>
                  {parseInlineMarkdown(trimmed.substring(level + 1))}
                </h4>
              );
            }

            return (
              <p key={lineIdx} style={{
                margin: '2px 0',
                fontSize: '9.5px',
                lineHeight: 1.4,
                minHeight: trimmed === '' ? '6px' : 'auto'
              }}>
                {parseInlineMarkdown(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  // Helper selectors for layout lists
  const runtime = entityData?.runtime;
  const missions = entityData?.missions;
  const toolboxes = entityData?.toolboxes;
  const inbox = entityData?.inbox;

  const pillarActives = runtime?.pillars?.actives || [];
  const evoActives = runtime?.evolution_objectives?.actives || [];

  // Flattened center missions list
  const getFlattenedMissions = () => {
    if (!missions) return [];
    const list: any[] = [];
    Object.entries(missions).forEach(([catKey, catVal]) => {
      if (!catVal || typeof catVal !== 'object') return;
      
      Object.entries(catVal).forEach(([mId, mObj]: [string, any]) => {
        if (mObj && typeof mObj === 'object') {
          list.push({ id: mId, category: catKey, type: catKey, ...mObj });
        }
      });
    });
    return list;
  };

  const getMissionStatus = (m: any) => {
    const rawStatus = String(m.status || '').toLowerCase();
    if (['drafting', 'draft', 'drafted', 'new'].includes(rawStatus)) return 'drafting';
    if (rawStatus === 'planning') return 'planning';
    if (rawStatus === 'execution') return 'execution';
    if (['archive', 'done', 'completed'].includes(rawStatus)) return 'archive';

    const rawClass = String(m.state?.class || '').toLowerCase();
    if (['draft', 'drafting', 'new'].includes(rawClass)) return 'drafting';
    if (rawClass === 'planning') return 'planning';
    if (rawClass === 'execution') return 'execution';
    if (['done', 'archive', 'completed'].includes(rawClass)) return 'archive';

    return 'drafting';
  };

  // Helper to gather all available prior outputs (Analytics, DeepResearch, Brainstorming, System Build, etc.)
  const getAvailableExtraSources = () => {
    const flattened = getFlattenedMissions();
    const sources: Array<{
      id: string;
      title: string;
      category: string;
      phase?: string;
      status?: string;
      summary?: string;
      isPreset?: boolean;
      data?: any;
    }> = [];

    // 1. From real workspace missions
    flattened.forEach(m => {
      const cat = m.type || m.category || 'standard';
      sources.push({
        id: m.id,
        title: m.objective || m.id,
        category: cat,
        phase: m.phase || 'planning',
        status: getMissionStatus(m),
        summary: m.inputs?.kpi_metrics || m.inputs?.research_topic || m.inputs?.creative_brief || m.inputs?.tech_stack || m.objective,
        data: m
      });
    });

    // 2. Add preset workspace stored outputs for quick selection
    const presetSources = [
      {
        id: 'out_analytics_ecom_cohorts_2026',
        title: 'E-Commerce Orders & LTV Cohort Report (ecom_orders_2026.csv)',
        category: 'analytics',
        phase: 'done',
        status: 'archive',
        summary: 'Conversion Rate: 3.8%, CAC: $42, LTV: $310. Top retention cohort: March 2026 Mobile buyers.',
        isPreset: true,
        data: {
          metrics: { conversion: '3.8%', cac: '$42', ltv: '$310' },
          dataset: 'ecom_orders_2026.csv',
          key_findings: 'Mobile checkout funnel experiences 12% dropoff on address verification.'
        }
      },
      {
        id: 'out_research_vector_rag_swarm',
        title: 'Vector RAG Benchmarks & Swarm Consensus Audit',
        category: 'deep_research',
        phase: 'done',
        status: 'archive',
        summary: 'Analyzed 18 ArXiv papers & YouTube tech talks. Hybrid sparse-dense retrieval with sub-50ms latency.',
        isPreset: true,
        data: {
          sources: 'ArXiv, YouTube Tech Transcripts, GitHub Repos',
          key_findings: 'Sub-agent swarm consensus reduces hallucination rate by 84% compared to single-agent prompts.'
        }
      },
      {
        id: 'out_brainstorm_zero_latency_ui',
        title: 'Zero-Latency Dynamic UI & Edge State Brief',
        category: 'brainstorming',
        phase: 'done',
        status: 'archive',
        summary: 'McKinsey 7S innovation matrix. Architectural blueprint for optimistic UI mutations and local state sync.',
        isPreset: true,
        data: {
          framework: 'McKinsey 7S Framework',
          constraints: 'Zero external SDK dependencies, <100ms latency',
          key_findings: 'Use optimistic client rendering backed by server-side idempotency keys.'
        }
      },
      {
        id: 'out_system_build_react19_core',
        title: 'React 19 + Next.js App Router Core Architecture',
        category: 'system_build',
        phase: 'done',
        status: 'archive',
        summary: 'Fully typed Next.js dashboard template with Tailwind v4 styling and zero-error compile state.',
        isPreset: true,
        data: {
          stack: 'React 19, TypeScript 5.8, Tailwind CSS v4, Next.js 16',
          key_findings: 'Production-ready build gate passed with 100% type coverage.'
        }
      }
    ];

    presetSources.forEach(ps => {
      if (!sources.some(s => s.id === ps.id)) {
        sources.push(ps);
      }
    });

    return sources;
  };

  const filteredMissions = getFlattenedMissions().filter(m => {
    const textToSearch = `${m.id} ${m.objective}`.toLowerCase();
    const matchesSearch = textToSearch.includes(searchQuery.toLowerCase());
    const matchesPrio = prioFilter === 'ALL' || m.priority === prioFilter;
    
    const tVal = String(m.type || m.category || 'standard').toLowerCase();
    const filterVal = typeFilter.toLowerCase();
    
    const matchesType = typeFilter === 'ALL' || tVal === filterVal;
    return matchesSearch && matchesPrio && matchesType;
  }).sort((a, b) => {
    if (sortOption === 'name') {
      return a.id.localeCompare(b.id);
    }
    if (sortOption === 'priority') {
      const weight: Record<string, number> = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return (weight[b.priority] || 0) - (weight[a.priority] || 0);
    }
    return 0; // Default sorting
  });

  const matchesPhase = (m: any, filterVal: string) => {
    if (filterVal === 'ALL') return true;
    const p = String(m.phase || m.stage || '').toLowerCase();
    return p.includes(filterVal.toLowerCase());
  };

  const mDraft = filteredMissions.filter(m => getMissionStatus(m) === 'drafting' && matchesPhase(m, draftingPhaseFilter));
  const mPlan = filteredMissions.filter(m => getMissionStatus(m) === 'planning' && matchesPhase(m, planningPhaseFilter));
  const mExec = filteredMissions.filter(m => getMissionStatus(m) === 'execution' && matchesPhase(m, executionPhaseFilter));
  const mArchive = filteredMissions.filter(m => getMissionStatus(m) === 'archive' && matchesPhase(m, deliveryPhaseFilter));

  const getPriorityClass = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'prio-crit';
      case 'HIGH': return 'prio-high';
      case 'MEDIUM': return 'prio-med';
      case 'LOW': default: return 'prio-low';
    }
  };

  if (!mounted || checkingAuth || !user || !onboardingCompleted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAF9F6',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#1C1C1E',
        fontFamily: '"Inter", system-ui, sans-serif',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(204, 122, 74, 0.15)',
          borderTopColor: '#CC7A4A',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        ` }} />
        <div style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#CC7A4A' }}>
          Syncing Security Session...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAF9F6',
        color: '#1C1C1E',
        fontFamily: '"Inter", system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '420px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Brand/Gateway Header */}
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            padding: '28px 24px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px'
          }}>
            <img 
              src="/fabrica-logo-2d.jpg" 
              alt="Fabrica Brand Logo" 
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
            />
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 900, letterSpacing: '-0.03em', color: '#1C1C1E' }}>
                Fabrica<span style={{ color: '#CC7A4A' }}>.</span> SaaS Gateway
              </h1>
              <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                Secure multi-tenant workspace registry
              </p>
            </div>
          </div>

          {/* Core Auth Area */}
          <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {isRecoveryMode ? (
              <form onSubmit={handleUpdatePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'rgba(204, 122, 74, 0.05)',
                  border: '1px solid rgba(204, 122, 74, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}>
                  <div style={{ color: '#CC7A4A', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🔒 Password Recovery
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#64748b', lineHeight: 1.45 }}>
                    Enter a secure, robust new password to finalize authentication with your account.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                    New Secure Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#1c1c1e',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#CC7A4A',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '10px',
                    fontWeight: 800,
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginTop: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Save New Password & Log In ➔
                </button>

                <button
                  type="button"
                  onClick={() => setIsRecoveryMode(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '10px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  Cancel and Return to Login
                </button>
              </form>
            ) : isForgotPassword ? (
              <form onSubmit={handleResetPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{
                  background: 'rgba(204, 122, 74, 0.05)',
                  border: '1px solid rgba(204, 122, 74, 0.2)',
                  borderRadius: '8px',
                  padding: '12px 14px'
                }}>
                  <div style={{ color: '#CC7A4A', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    🔑 Reset Password
                  </div>
                  <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#64748b', lineHeight: 1.45 }}>
                    Enter your email to receive a secure recovery link.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#1c1c1e',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#CC7A4A',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '10px',
                    fontWeight: 800,
                    fontSize: '11px',
                    cursor: 'pointer',
                    marginTop: '6px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  Send Recovery Link ➔
                </button>

                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '10px',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    fontWeight: 600
                  }}
                >
                  Cancel and Return to Login
                </button>
              </form>
            ) : (
              <>
                {supabase ? (
                  <>
                    <p style={{ margin: 0, fontSize: '11.5px', color: '#475569', lineHeight: 1.5, textAlign: 'center', marginBottom: '16px' }}>
                      Please authenticate with your corporate credentials to access your isolated workspace records and active agent execution backlogs.
                    </p>

                    <div className="supabase-auth-wrapper" style={{
                      '--colors-brand': '#CC7A4A',
                      '--colors-brandAccent': '#b2693e',
                      '--colors-inputBackground': '#ffffff',
                      '--colors-inputText': '#1c1c1e',
                      '--colors-inputBorder': '#cbd5e1',
                      '--colors-inputLabelText': '#475569',
                      '--colors-dividerBackground': '#e2e8f0',
                      '--colors-messageText': '#CC7A4A',
                      '--colors-anchorTextColor': '#CC7A4A'
                    } as any}>
                      <Auth
                        supabaseClient={supabase}
                        appearance={{
                          theme: ThemeSupa,
                          style: {
                            button: { background: '#CC7A4A', color: '#ffffff', border: 'none', fontWeight: '800', borderRadius: '6px', fontSize: '11px', padding: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' },
                            input: { background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#1c1c1e', fontSize: '11px', padding: '8px 12px' },
                            label: { fontSize: '9px', fontWeight: '800', textTransform: 'uppercase', color: '#475569', marginBottom: '4px', letterSpacing: '0.04em' },
                            anchor: { color: '#CC7A4A', fontSize: '10px', fontWeight: 700 }
                          }
                        }}
                        theme="default"
                        providers={[]}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setIsForgotPassword(true)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#CC7A4A',
                          fontSize: '10px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          textDecoration: 'underline'
                        }}
                      >
                        🔑 Forgot Password?
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      background: 'rgba(204, 122, 74, 0.05)',
                      border: '1px solid rgba(204, 122, 74, 0.2)',
                      borderRadius: '8px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}>
                      <div style={{ color: '#CC7A4A', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        💡 Sandbox Demo Mode Active
                      </div>
                      <p style={{ margin: 0, fontSize: '10px', color: '#64748b', lineHeight: 1.45 }}>
                        Real Supabase connection keys are not yet configured in your server environment variables. A high-fidelity sandbox is available to test the registration experience.
                      </p>
                    </div>

                    <form onSubmit={handleSandboxLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                        <button
                          type="button"
                          onClick={() => setIsSandboxSignUp(false)}
                          style={{
                            flex: 1,
                            background: !isSandboxSignUp ? '#1C1C1E' : 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            color: !isSandboxSignUp ? '#fff' : '#64748b',
                            padding: '6px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Sign In
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsSandboxSignUp(true)}
                          style={{
                            flex: 1,
                            background: isSandboxSignUp ? '#1C1C1E' : 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            color: isSandboxSignUp ? '#fff' : '#64748b',
                            padding: '6px',
                            fontSize: '10.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          Sign Up (New Tenant)
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={sandboxEmail}
                          onChange={(e) => setSandboxEmail(e.target.value)}
                          placeholder="service.mrigel@gmail.com"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: '#1c1c1e',
                            fontSize: '11px',
                            outline: 'none',
                            transition: 'border-color 0.15s'
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                            Password
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsForgotPassword(true)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#CC7A4A',
                              fontSize: '9px',
                              cursor: 'pointer',
                              fontWeight: 700,
                              textDecoration: 'underline',
                              padding: 0
                            }}
                          >
                            Forgot Password?
                          </button>
                        </div>
                        <input
                          type="password"
                          required
                          value={sandboxPassword}
                          onChange={(e) => setSandboxPassword(e.target.value)}
                          placeholder="••••••••"
                          style={{
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            color: '#1c1c1e',
                            fontSize: '11px',
                            outline: 'none',
                            transition: 'border-color 0.15s'
                          }}
                        />
                      </div>

                      <button
                        type="submit"
                        style={{
                          background: '#CC7A4A',
                          border: 'none',
                          borderRadius: '6px',
                          color: '#ffffff',
                          padding: '10px',
                          fontWeight: 800,
                          fontSize: '11px',
                          cursor: 'pointer',
                          marginTop: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          transition: 'background-color 0.15s'
                        }}
                      >
                        {isSandboxSignUp ? 'Create Isolated Tenant ➔' : 'Secure Authenticate Session ➔'}
                      </button>

                    </form>

                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '14px', borderTop: '1px solid #f1f5f9', paddingTop: '12px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(sandboxEmail || '');
                          setIsForgotPassword(true);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#CC7A4A',
                          fontSize: '10.5px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          textDecoration: 'underline',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🔑 Forgot your password? Click here to reset
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Footer of card */}
          <div style={{
            background: '#fafafa',
            borderTop: '1px solid #f1f5f9',
            padding: '16px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '10.5px'
          }}>
            <Link href="/" style={{ color: '#64748b', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
              ← Return to Landing Page
            </Link>
            <span style={{ color: '#94a3b8', fontWeight: 500 }}>v1.0.0 (Production)</span>
          </div>
        </div>
      </div>
    );
  }

  if (user && !onboardingCompleted) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#FAF9F6',
        color: '#1C1C1E',
        fontFamily: '"Inter", system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px'
      }}>
        {/* Onboarding Wizard Card */}
        <div style={{
          width: '100%',
          maxWidth: onboardingStep === 'plan' ? '780px' : '520px',
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.02)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          transition: 'max-width 0.3s ease-in-out'
        }}>
          {/* Header */}
          <div style={{
            background: '#ffffff',
            borderBottom: '1px solid #f1f5f9',
            padding: '24px 32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img 
                src="/fabrica-logo-2d.jpg" 
                alt="Fabrica Brand Logo" 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0'
                }}
              />
              <div>
                <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 900, letterSpacing: '-0.02em', color: '#1C1C1E' }}>
                  Setup Your Fabrica Workspace
                </h1>
                <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 500 }}>
                  Personalize your isolated SaaS multi-tenant environment
                </p>
              </div>
            </div>

            {/* Progress Bar / Steps */}
            <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ height: '3px', background: '#CC7A4A', borderRadius: '2px' }}></div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#CC7A4A', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  1. Profile Details
                </span>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ height: '3px', background: onboardingStep === 'plan' ? '#CC7A4A' : '#e2e8f0', borderRadius: '2px', transition: 'background-color 0.2s' }}></div>
                <span style={{ fontSize: '9px', fontWeight: 800, color: onboardingStep === 'plan' ? '#CC7A4A' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', transition: 'color 0.2s' }}>
                  2. Choose Plan
                </span>
              </div>
            </div>
          </div>

          {/* Form Content */}
          <div style={{ padding: '32px', background: '#ffffff' }}>
            {onboardingStep === 'info' ? (
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!onboardingUsername.trim()) {
                    setToast({ message: 'Username is required to isolate your workspace tenant.', type: 'error', isOpen: true });
                    return;
                  }
                  if (!onboardingUseCases.trim()) {
                    setToast({ message: 'Please specify what you will use Fabrica for.', type: 'error', isOpen: true });
                    return;
                  }
                  
                  // Save values to localStorage as a durable draft
                  localStorage.setItem(`fabrica_ob_fullname_${user.id}`, onboardingFullName);
                  localStorage.setItem(`fabrica_ob_username_${user.id}`, onboardingUsername.replace('@', '').trim());
                  localStorage.setItem(`fabrica_ob_hear_${user.id}`, onboardingHearAbout);
                  localStorage.setItem(`fabrica_ob_compname_${user.id}`, onboardingCompanyName);
                  localStorage.setItem(`fabrica_ob_compsize_${user.id}`, onboardingCompanySize);
                  localStorage.setItem(`fabrica_ob_comprole_${user.id}`, onboardingCompanyRole);
                  localStorage.setItem(`fabrica_ob_usecases_${user.id}`, onboardingUseCases);

                  if (SHOW_PAYMENT_UI) {
                    setOnboardingStep('plan');
                  } else {
                    setSelectedPlan('free');
                    localStorage.setItem(`fabrica_onboarding_completed_${user?.id || 'default'}`, 'true');
                    setOnboardingCompleted(true);
                    setToast({
                      message: `Welcome to Fabrica! Workspace launched on Free Beta Access.`,
                      type: 'success',
                      isOpen: true
                    });
                  }
                }}
                style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
              >
                {/* Username and Full Name row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                      Username <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <span style={{ position: 'absolute', left: '12px', fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>@</span>
                      <input
                        type="text"
                        required
                        placeholder="username"
                        value={onboardingUsername}
                        onChange={(e) => setOnboardingUsername(e.target.value.replace(/\s+/g, '').replace('@', ''))}
                        style={{
                          width: '100%',
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 12px 8px 24px',
                          color: '#1c1c1e',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                      Full Name <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Alex Johnson"
                      value={onboardingFullName}
                      onChange={(e) => setOnboardingFullName(e.target.value)}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#1c1c1e',
                        fontSize: '11px',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Where did you hear about us */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                    Where did you hear about us? <span style={{ color: '#94a3b8', fontWeight: 500 }}>(Optional)</span>
                  </label>
                  <select
                    value={onboardingHearAbout}
                    onChange={(e) => setOnboardingHearAbout(e.target.value)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#1c1c1e',
                      fontSize: '11px',
                      outline: 'none'
                    }}
                  >
                    <option value="">Select an option...</option>
                    <option value="google">Google Search</option>
                    <option value="twitter">Twitter / X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="friend">Friend or Colleague</option>
                    <option value="newsletter">Tech Blog / Newsletter</option>
                    <option value="youtube">YouTube</option>
                    <option value="other">Other Source</option>
                  </select>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>

                {/* Company Information Group */}
                <div>
                  <h3 style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#1c1c1e', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    🏢 Corporate & Company Information <span style={{ color: '#94a3b8', fontWeight: 500, textTransform: 'none', fontSize: '9px', letterSpacing: 0 }}>(Optional)</span>
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                        Company Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Acme SaaS Corp"
                        value={onboardingCompanyName}
                        onChange={(e) => setOnboardingCompanyName(e.target.value)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#1c1c1e',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                        Company Size
                      </label>
                      <select
                        value={onboardingCompanySize}
                        onChange={(e) => setOnboardingCompanySize(e.target.value)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#1c1c1e',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      >
                        <option value="">Choose Size...</option>
                        <option value="solo">Just Me</option>
                        <option value="small">2-10 people</option>
                        <option value="mid">11-50 people</option>
                        <option value="growth">51-200 people</option>
                        <option value="enterprise">200+ people</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#64748b' }}>
                        Your Role
                      </label>
                      <select
                        value={onboardingCompanyRole}
                        onChange={(e) => setOnboardingCompanyRole(e.target.value)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '8px 12px',
                          color: '#1c1c1e',
                          fontSize: '11px',
                          outline: 'none'
                        }}
                      >
                        <option value="">Role...</option>
                        <option value="founder">Founder / CEO</option>
                        <option value="lead">Lead Architect</option>
                        <option value="engineer">Engineer</option>
                        <option value="pm">Product Mgr</option>
                        <option value="ops">DevOps / SRE</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#f1f5f9', margin: '4px 0' }}></div>

                {/* Primary Use Case */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#475569' }}>
                    What will you use Fabrica for? <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    required
                    value={onboardingUseCases}
                    onChange={(e) => setOnboardingUseCases(e.target.value)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#1c1c1e',
                      fontSize: '11px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <option value="">Select a primary use case...</option>
                    <option value="Architecting & simulating agent specs">Architecting & simulating agent specs</option>
                    <option value="Personal project exploration">Personal project exploration</option>
                    <option value="Enterprise multi-tenant integration">Enterprise multi-tenant integration</option>
                    <option value="Academic research / Learning">Academic research / Learning</option>
                    <option value="Other SaaS development">Other SaaS development</option>
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    background: '#CC7A4A',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#ffffff',
                    padding: '12px',
                    fontWeight: 800,
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    marginTop: '8px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    boxShadow: '0 4px 12px rgba(204, 122, 74, 0.2)'
                  }}
                >
                  {SHOW_PAYMENT_UI ? 'Continue to Plan Selection ➔' : 'Complete Profile & Launch Workspace ➔'}
                </button>
              </form>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div style={{ textAlign: 'center', maxWidth: '580px', margin: '0 auto' }}>
                  <h3 style={{ margin: '0 0 6px', fontSize: '15px', fontWeight: 900, color: '#1C1C1E' }}>
                    Choose Your Plan (Non-Profit Pass-Through Pricing)
                  </h3>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b', lineHeight: 1.5 }}>
                    The multi-key load balancer pool is strictly reserved for the <b>Free Starter Tier</b>. Paid plans feature at-cost provider pricing with 0% platform profit margin.
                  </p>
                </div>

                {/* Pricing Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1.1fr 1fr',
                  gap: '16px',
                  alignItems: 'stretch',
                  marginTop: '10px'
                }}>
                  {/* Free Plan */}
                  <div 
                    onClick={() => {
                      setSelectedPlan('free');
                      localStorage.setItem(`fabrica_ob_plan_${user?.id || 'default'}`, 'free');
                    }}
                    style={{
                      background: selectedPlan === 'free' ? '#ffffff' : '#fcfcfc',
                      border: selectedPlan === 'free' ? '2.5px solid #CC7A4A' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '24px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      boxShadow: selectedPlan === 'free' ? '0 12px 24px rgba(204, 122, 74, 0.08)' : 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#10b981', letterSpacing: '0.04em' }}>
                        Free Starter Tier ($0)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                        <b style={{ fontSize: '24px', fontWeight: 900, color: '#1c1c1e' }}>$0</b>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/ month</span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '9.5px', color: '#64748b', lineHeight: 1.4 }}>
                        Powered exclusively by our shared multi-key load balancer pool.
                      </p>
                    </div>

                    <div style={{ height: '1px', background: '#f1f5f9', margin: '12px 0' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '9px', color: '#475569', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span><b>Shared Multi-Key Key Pool</b> (Gemini 3.6 Flash, Llama 3.3 70B, DeepSeek R1)</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span><b>$0 Card Verification</b> anti-bot safeguard (No charge)</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span>Automatic round-robin failover & rate-limit lock isolation</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span>2 active workspace blueprints</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#10b981' }}>✓</b> <span>Community forum support</span></div>
                    </div>
                  </div>

                  {/* Power User Plan (At Cost) */}
                  <div 
                    onClick={() => {
                      setSelectedPlan('power');
                      localStorage.setItem(`fabrica_ob_plan_${user?.id || 'default'}`, 'power');
                    }}
                    style={{
                      background: '#ffffff',
                      border: selectedPlan === 'power' ? '2.5px solid #CC7A4A' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '24px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      boxShadow: selectedPlan === 'power' ? '0 16px 36px rgba(204, 122, 74, 0.12)' : '0 4px 12px rgba(0,0,0,0.01)',
                      transform: selectedPlan === 'power' ? 'translateY(-4px)' : 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: '-10px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#CC7A4A',
                      color: '#ffffff',
                      fontSize: '7.5px',
                      fontWeight: 900,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em'
                    }}>
                      At Cost (0% Platform Profit)
                    </div>

                    <div style={{ marginBottom: '16px', marginTop: '4px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#CC7A4A', letterSpacing: '0.04em' }}>
                        Developer Pro (At Cost)
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                        <b style={{ fontSize: '28px', fontWeight: 900, color: '#1c1c1e' }}>$15</b>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/ mo pass-through</span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '9.5px', color: '#64748b', lineHeight: 1.4 }}>
                        Pure pass-through cost model. Zero profit markup taken on token or container usage.
                      </p>
                    </div>

                    <div style={{ height: '1px', background: '#f1f5f9', margin: '12px 0' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '9px', color: '#475569', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span><b>0% Platform Profit</b> — Direct raw API provider billing</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span><b>BYOK (Bring Your Own Key)</b> direct key registration</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span><b>Dedicated Throughput Pipeline</b> (Bypasses shared pool queues)</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span>Direct access to Gemini 1.5 Pro, Claude 3.5 & GPT-4o</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span>Unlimited projects & full token usage telemetry</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#CC7A4A' }}>✓</b> <span>Priority Email & Discord support</span></div>
                    </div>
                  </div>

                  {/* Enterprise Pass-Through Plan (At Cost) */}
                  <div 
                    onClick={() => {
                      setSelectedPlan('enterprise');
                      localStorage.setItem(`fabrica_ob_plan_${user?.id || 'default'}`, 'enterprise');
                    }}
                    style={{
                      background: selectedPlan === 'enterprise' ? '#ffffff' : '#fcfcfc',
                      border: selectedPlan === 'enterprise' ? '2.5px solid #CC7A4A' : '1px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '24px 20px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      boxShadow: selectedPlan === 'enterprise' ? '0 12px 24px rgba(204, 122, 74, 0.08)' : 'none',
                      transition: 'all 0.15s ease-in-out'
                    }}
                  >
                    <div style={{ marginBottom: '16px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', color: '#6366f1', letterSpacing: '0.04em' }}>
                        Enterprise Pass-Through
                      </span>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginTop: '6px' }}>
                        <b style={{ fontSize: '24px', fontWeight: 900, color: '#1c1c1e' }}>$99</b>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>/ mo base infra</span>
                      </div>
                      <p style={{ margin: '8px 0 0', fontSize: '9.5px', color: '#64748b', lineHeight: 1.4 }}>
                        Dedicated container cluster & custom pass-through billing at 0% margin.
                      </p>
                    </div>

                    <div style={{ height: '1px', background: '#f1f5f9', margin: '12px 0' }}></div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '9px', color: '#475569', marginBottom: '20px' }}>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span><b>0% Profit Margin</b> — Raw compute & model pass-through</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span><b>Dedicated Private Cluster</b> & multi-tenant isolation</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span>Custom prompt guardrails & corporate governance</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span>SSO / SAML authentication & compliance logs</span></div>
                      <div style={{ display: 'flex', gap: '6px' }}><b style={{ color: '#6366f1' }}>✓</b> <span>24/7 Dedicated SRE sandbox container support</span></div>
                    </div>
                  </div>
                </div>

                {/* Confirm Actions */}
                <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                  <button
                    type="button"
                    onClick={() => setOnboardingStep('info')}
                    style={{
                      background: 'transparent',
                      border: '1.5px solid #cbd5e1',
                      borderRadius: '6px',
                      color: '#475569',
                      padding: '12px 20px',
                      fontWeight: 700,
                      fontSize: '11px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    ← Back to Details
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedPlan === 'free') {
                        localStorage.setItem(`fabrica_onboarding_completed_${user?.id || 'default'}`, 'true');
                        setOnboardingCompleted(true);
                        setToast({
                          message: `Welcome to Fabrica! Your workspace is active on the FREE tier.`,
                          type: 'success',
                          isOpen: true
                        });
                      } else {
                        setToast({
                          message: `Redirecting to secure payment portal for the ${selectedPlan.toUpperCase()} subscription...`,
                          type: 'info',
                          isOpen: true
                        });
                        setTimeout(() => {
                          localStorage.setItem(`fabrica_onboarding_completed_${user?.id || 'default'}`, 'true');
                          setOnboardingCompleted(true);
                          setToast({
                            message: `Payment Successful! Welcome to your Fabrica ${selectedPlan.toUpperCase()} Workspace.`,
                            type: 'success',
                            isOpen: true
                          });
                        }, 1800);
                      }
                    }}
                    style={{
                      flex: 1,
                      background: '#CC7A4A',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#ffffff',
                      padding: '12px',
                      fontWeight: 800,
                      fontSize: '11.5px',
                      cursor: 'pointer',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                      boxShadow: '0 4px 12px rgba(204, 122, 74, 0.25)',
                      textAlign: 'center'
                    }}
                  >
                    {selectedPlan === 'free' ? 'Go to dashboard ➔' : 'Go to Payment ➔'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (isTenantSetupInitializing) {
    return (
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        width: '100%',
        background: '#0f172a',
        overflow: 'hidden',
        fontFamily: 'var(--sans, system-ui, sans-serif)'
      }}>
        {/* Skeleton Blurred Dashboard Background */}
        <div style={{
          filter: 'blur(10px) opacity(0.35)',
          pointerEvents: 'none',
          userSelect: 'none',
          padding: '24px',
          display: 'grid',
          gridTemplateColumns: '260px 1fr 300px',
          gap: '20px',
          height: '100vh',
          boxSizing: 'border-box'
        }}>
          <div style={{ background: '#334155', borderRadius: '12px', height: '100%' }}></div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ background: '#475569', height: '54px', borderRadius: '10px' }}></div>
            <div style={{ background: '#334155', flex: 1, borderRadius: '12px' }}></div>
          </div>
          <div style={{ background: '#334155', borderRadius: '12px', height: '100%' }}></div>
        </div>

        {/* Centered Modal Overlay Card */}
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(16px)',
          padding: '24px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            background: 'linear-gradient(145deg, #1e293b, #0f172a)',
            border: '1.5px solid rgba(204, 122, 74, 0.4)',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 30px rgba(204, 122, 74, 0.15)',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '22px',
            textAlign: 'center'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #CC7A4A, #b2693e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(204, 122, 74, 0.35)'
              }}>
                <img src="/fabrica-logo-2d.jpg" alt="Fabrica Logo" style={{ width: '42px', height: '42px', borderRadius: '12px' }} />
              </div>

              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.01em', lineHeight: 1.4 }}>
                Welcome to Fabrica. Verifying Workspace Setup & Cloud Infrastructure
              </h2>
              
              <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
                Verifying Supabase user, tier subscription, vault credentials, and dedicated GCS storage bucket...
              </p>
            </div>

            {/* Progress Bar Container */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontWeight: 700, color: '#cbd5e1' }}>
                <span>{tenantSetupStep}</span>
                <span style={{ color: '#CC7A4A', fontFamily: 'monospace' }}>{tenantSetupProgress}%</span>
              </div>
              <div style={{
                width: '100%',
                height: '10px',
                backgroundColor: '#334155',
                borderRadius: '999px',
                overflow: 'hidden',
                padding: '2px',
                boxSizing: 'border-box'
              }}>
                <div style={{
                  height: '100%',
                  width: `${tenantSetupProgress}%`,
                  background: 'linear-gradient(90deg, #CC7A4A 0%, #f59e0b 100%)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease-in-out'
                }} />
              </div>
            </div>

            {/* Step Checklist */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              background: 'rgba(15, 23, 42, 0.6)',
              border: '1px solid #334155',
              borderRadius: '10px',
              padding: '14px',
              textAlign: 'left',
              fontSize: '11px',
              color: '#cbd5e1'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tenantSetupProgress >= 20 ? '#34d399' : '#64748b' }}>
                <span>{tenantSetupProgress >= 20 ? '✓' : '⏳'}</span>
                <span>Supabase User & Subscription Tier Verification</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tenantSetupProgress >= 40 ? '#34d399' : '#64748b' }}>
                <span>{tenantSetupProgress >= 40 ? '✓' : '⏳'}</span>
                <span>Tenant Identity & Vault Credentials (<code>user_tiers</code>)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tenantSetupProgress >= 60 ? '#34d399' : '#64748b' }}>
                <span>{tenantSetupProgress >= 60 ? '✓' : '⏳'}</span>
                <span>Dedicated Google Cloud Storage Bucket (<code>bucket_id</code>)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tenantSetupProgress >= 80 ? '#34d399' : '#64748b' }}>
                <span>{tenantSetupProgress >= 80 ? '✓' : '⏳'}</span>
                <span>User Container Instance (<code>container_id</code>)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: tenantSetupProgress >= 100 ? '#34d399' : '#64748b' }}>
                <span>{tenantSetupProgress >= 100 ? '✓' : '⏳'}</span>
                <span>Workspace Directory & Runtime Board (<code>/mnt/</code>)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="drafting-grid" dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>


      {/* ================= CONTEXT PIPELINE HERO BANNER ================= */}
      {!heroCollapsed && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(99, 102, 241, 0.06) 60%, rgba(16, 185, 129, 0.04) 100%)',
          borderBottom: '1.5px solid rgba(16, 185, 129, 0.22)',
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(16, 185, 129, 0.018) 60px, rgba(16, 185, 129, 0.018) 61px)',
            pointerEvents: 'none'
          }}></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flex: 1, minWidth: 0, position: 'relative' }}>
            <div>
              <div style={{ fontSize: '9px', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '2px', fontFamily: 'var(--sans)' }}>
                {dtxt.heroTag}
              </div>
              <h1 style={{ margin: 0, fontSize: '13px', fontWeight: 800, lineHeight: 1.3, fontFamily: 'var(--sans)' }}>
                {(() => {
                  const hlBlue: React.CSSProperties = {
                    color: '#0284c7',
                    backgroundColor: 'rgba(2, 132, 199, 0.12)',
                    border: '1px solid rgba(2, 132, 199, 0.25)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    display: 'inline-block',
                    margin: '0 2px'
                  };
                  if (uiLang === 'FR') {
                    return (
                      <>
                        Savoir <span style={hlBlue}>Quoi (What)</span> construire est un problème d'opérations, pas de <span style={hlBlue}>Comment (How)</span> technique.
                      </>
                    );
                  }
                  if (uiLang === 'AR') {
                    return (
                      <>
                        تحديد <span style={hlBlue}>ماذا (What)</span> نبني مشكلة تشغيلية، وليست <span style={hlBlue}>كيف (How)</span> تقنية.
                      </>
                    );
                  }
                  return (
                    <>
                      <span style={hlBlue}>What</span> to build is an operations problem, not a technical <span style={hlBlue}>How</span>.
                    </>
                  );
                })()}
              </h1>
              <p style={{ margin: '4px 0 0', fontSize: '9.5px', color: 'var(--muted)', lineHeight: 1.4, fontFamily: 'var(--sans)' }}>
                {(() => {
                  const hlGreen: React.CSSProperties = {
                    color: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    display: 'inline-block',
                    margin: '0 2px'
                  };
                  const hlAmber: React.CSSProperties = {
                    color: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    fontWeight: 800,
                    display: 'inline-block',
                    margin: '0 2px'
                  };
                  if (uiLang === 'FR') {
                    return (
                      <>
                        Fabrica établit votre centre d'opérations. Transformez vos <span style={hlAmber}>Entrées (Inputs)</span> en <span style={hlGreen}>Projets Personnalisés (Custom Projects)</span> pour générer des <span style={hlAmber}>Sorties (Outputs)</span>.
                      </>
                    );
                  }
                  if (uiLang === 'AR') {
                    return (
                      <>
                        تؤسس Fabrica مركز عملياتك. تحويل <span style={hlAmber}>المدخلات (Inputs)</span> والسجلات إلى <span style={hlGreen}>مشاريع مخصصة (Custom Projects)</span> لإصدار <span style={hlAmber}>المخرجات (Outputs)</span>.
                      </>
                    );
                  }
                  return (
                    <>
                      Fabrica establishes your operations hub. Transform <span style={hlAmber}>Inputs</span> (materials, spreadsheets & data) into <span style={hlGreen}>Custom Projects</span> for actionable <span style={hlAmber}>Outputs</span>.
                    </>
                  );
                })()}
              </p>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.22)', border: '1.2px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '3px 9px', fontSize: '9.5px' }}>
                <span>🎙️</span><span style={{ color: 'var(--muted)' }}>{dtxt.pmInterview}</span>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{uiLang === 'AR' ? '←' : '→'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.22)', border: '1.2px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '3px 9px', fontSize: '9.5px' }}>
                <span>📡</span><span style={{ color: 'var(--muted)' }}>{dtxt.signalIngest}</span>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{uiLang === 'AR' ? '←' : '→'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(0,0,0,0.22)', border: '1.2px solid rgba(255,255,255,0.06)', borderRadius: '20px', padding: '3px 9px', fontSize: '9.5px' }}>
                <span>📋</span><span style={{ color: 'var(--muted)' }}>{dtxt.livingSpec}</span>
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '11px' }}>{uiLang === 'AR' ? '←' : '→'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(16,185,129,0.12)', border: '1.2px solid rgba(16,185,129,0.3)', borderRadius: '20px', padding: '3px 9px', fontSize: '9.5px' }}>
                <span>🤖</span><span style={{ color: '#10b981', fontWeight: 700 }}>{dtxt.agentPrompt}</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => { setHeroCollapsed(true); localStorage.setItem('pb_hero_dismissed', '1'); }}
            style={{
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '4px',
              color: 'var(--muted)',
              fontSize: '11px',
              padding: '2px 7px',
              cursor: 'pointer',
              transition: 'all 0.15s'
            }}
            title="Dismiss banner"
          >✕</button>
        </div>
      )}



      {/* ================= MOBILE NAVIGATION TAB BAR ================= */}
      <div className="mobile-dashboard-nav" dir={uiLang === 'AR' ? 'rtl' : 'ltr'}>
        <button
          className={`mobile-nav-btn ${mobileTab === 'center' ? 'active' : ''}`}
          onClick={() => handleMobileTabSelect('center')}
        >
          🎯 Missions HQ
        </button>
        <button
          className={`mobile-nav-btn ${mobileTab === 'left' ? 'active' : ''}`}
          onClick={() => handleMobileTabSelect('left')}
        >
          ⚡ Agent & Chat
        </button>
        <button
          className={`mobile-nav-btn ${mobileTab === 'right' ? 'active' : ''}`}
          onClick={() => handleMobileTabSelect('right')}
        >
          ⚙️ Projects & Portfolio
        </button>
      </div>

      {/* ================= THREE COLUMN MASTER RESPONSIVE GRID ================= */}
      <main className={`dashboard-grid ${minCenter ? 'min-center' : ''} ${minSide ? 'min-side' : ''} mobile-tab-${mobileTab}`} style={{ flex: 1, gridTemplateColumns: getGridTemplateColumns() }}>
        
        {/* ============ LEFT COLUMN: RUNTIME & AGENT CHAT ============ */}
        <aside className="col lside">
          <section className="pane" style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: 'none' }}>
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              filter: isAgentInitialized ? 'none' : 'blur(5px)',
              pointerEvents: isAgentInitialized ? 'auto' : 'none',
              userSelect: isAgentInitialized ? 'auto' : 'none',
              opacity: isAgentInitialized ? 1 : 0.6,
              transition: 'filter 0.3s ease, opacity 0.3s ease'
            }}>
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '2px 8px',
                height: '28px',
                minHeight: '28px',
                maxHeight: '28px',
                boxSizing: 'border-box',
                background: 'var(--surface-alt)',
                borderBottom: '1px solid var(--border-soft)',
                gap: '6px',
                flexWrap: 'nowrap'
              }}>
                {/* Line 1: Header title on left, Context bar & Model selector on right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, padding: '0px' }}>
                    {/* Streaming Toggle Button */}
                    <button
                      type="button"
                      onClick={() => setIsStreamingEnabled(!isStreamingEnabled)}
                      title={isStreamingEnabled ? "Streaming Mode ENABLED (SSE Real-Time Responses)" : "Streaming Mode DISABLED (Single Response)"}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        background: isStreamingEnabled ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-alt)',
                        border: isStreamingEnabled ? '1px solid #10b981' : '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        height: '18px',
                        fontSize: '7.5px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 800,
                        color: isStreamingEnabled ? '#10b981' : 'var(--text-bright)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        transition: 'all 0.15s'
                      }}
                    >
                      <span style={{ fontSize: '8.5px' }}>⚡</span>
                      <span>{isStreamingEnabled ? 'STREAM ON' : 'STREAM OFF'}</span>
                    </button>

                    {/* Live PI Session Context Window Meter Bar in Header */}
                    <div
                      onClick={() => {
                        const tenantKey = user?.id || activeEntity || 'default_user';
                        refreshPiContext(tenantKey);
                      }}
                      title={`Session Context Window: ${(piContext?.tokensUsed ?? 0).toLocaleString()} / ${(piContext?.maxTokens ?? 200000).toLocaleString()} tokens (${piContext?.percentUsed ?? 0}%). Click to refresh.`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '4px',
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        height: '18px',
                        fontSize: '7.5px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 800,
                        color: 'var(--text-bright)',
                        cursor: 'pointer',
                        flex: 1,
                        minWidth: 0,
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0, overflow: 'hidden', flex: 1 }}>
                        <span style={{ color: 'var(--accent-2)', fontSize: '8.5px', flexShrink: 0 }}>📊</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          CTX: {(piContext?.tokensUsed ?? 0).toLocaleString()} / {(piContext?.maxTokens ?? 200000) >= 1000000 ? `${((piContext?.maxTokens ?? 200000) / 1000000).toFixed(1)}M` : `${((piContext?.maxTokens ?? 200000) / 1000).toFixed(0)}k`}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, maxWidth: '100px', minWidth: '40px' }}>
                        <div style={{ flex: 1, height: '4px', background: 'var(--border-soft)', borderRadius: '2px', overflow: 'hidden' }}>
                          <div
                            style={{
                              width: `${Math.max(4, Math.min(100, piContext?.percentUsed ?? 0))}%`,
                              height: '100%',
                              background: (piContext?.percentUsed ?? 0) > 85 ? '#ef4444' : (piContext?.percentUsed ?? 0) > 60 ? '#f59e0b' : '#10b981',
                              transition: 'width 0.3s ease'
                            }}
                          />
                        </div>
                        <span style={{ fontSize: '7.5px', opacity: 0.9, flexShrink: 0, fontFamily: 'var(--mono)' }}>{piContext?.percentUsed ?? 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0, paddingLeft: '2px', paddingRight: '2px', paddingTop: '0px', paddingBottom: '0px' }}>
                    {/* Model Selector */}
                    <select
                      value={chatModel}
                      onChange={(e) => {
                        handleModelChange(e.target.value);
                      }}
                      title="Select AI Model"
                      style={{
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        color: 'var(--accent)',
                        fontSize: '7.5px',
                        fontFamily: 'var(--mono)',
                        fontWeight: 800,
                        outline: 'none',
                        cursor: 'pointer',
                        padding: '0px 2px',
                        maxWidth: '120px',
                        height: '18px',
                        textTransform: 'uppercase',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        opacity: 1
                      }}
                    >
                      {renderModelOptions()}
                    </select>

                    {/* BYOK Mode Controls Strip */}
                    {tokenBillingMode === 'byok' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => setShowOnlyFree(!showOnlyFree)}
                          title={showOnlyFree ? "Show Only Free Models ENABLED" : "Show Only Free Models DISABLED"}
                          style={{
                            height: '18px', padding: '0 3px', fontSize: '7px', fontWeight: 800,
                            borderRadius: '4px', border: showOnlyFree ? '1px solid #10b981' : '1px solid var(--border-soft)',
                            background: showOnlyFree ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-alt)',
                            color: showOnlyFree ? '#10b981' : 'var(--text-bright)',
                            cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          {showOnlyFree ? '⚡ FREE ONLY' : 'ALL'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setAutoFreeFallback(!autoFreeFallback)}
                          title={autoFreeFallback ? "Auto Free Fallback ENABLED" : "Auto Free Fallback DISABLED"}
                          style={{
                            height: '18px', padding: '0 3px', fontSize: '7px', fontWeight: 800,
                            borderRadius: '4px', border: autoFreeFallback ? '1px solid #8b5cf6' : '1px solid var(--border-soft)',
                            background: autoFreeFallback ? 'rgba(139, 92, 246, 0.15)' : 'var(--surface-alt)',
                            color: autoFreeFallback ? '#8b5cf6' : 'var(--text-bright)',
                            cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          {autoFreeFallback ? '🔄 ROTATE' : 'OFF'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAccountWindowOpen(true)}
                          title="Configure Provider API Keys & Rotation Settings"
                          style={{
                            height: '18px', padding: '0 3px', fontSize: '7px', fontWeight: 800,
                            borderRadius: '4px', border: '1px solid var(--border-soft)',
                            background: 'var(--surface-alt)', color: 'var(--text)',
                            cursor: 'pointer', flexShrink: 0
                          }}
                        >
                          ⚙️ KEYS
                        </button>
                      </div>
                    )}

                    {/* Merged Active Session Button (Small compact badge style) */}
                    <div style={{ position: 'relative' }}>
                      {(() => {
                        const activeSession = sessions.find((s) => s.id === activeSessionId);
                        const currentSessionName = activeSession?.name || 'Main Session';

                        return (
                          <button
                            onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                              height: '18px',
                              padding: '1px 3px',
                              borderRadius: '4px',
                              background: showSessionDropdown ? 'var(--accent)' : 'var(--surface-alt)',
                              color: showSessionDropdown ? 'var(--accent-contrast)' : 'var(--accent)',
                              border: '1px solid var(--border-soft)',
                              fontSize: '7px',
                              fontFamily: 'var(--mono)',
                              fontWeight: 800,
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              maxWidth: '75px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={`Active Session: ${currentSessionName}. Click to manage sessions.`}
                          >
                            <span style={{ color: showSessionDropdown ? 'var(--accent-contrast)' : '#10b981', fontSize: '6.5px', flexShrink: 0 }}>●</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                              {currentSessionName}
                            </span>
                            <span style={{ fontSize: '6px', opacity: 0.8, flexShrink: 0 }}>▾</span>
                          </button>
                        );
                      })()}

                      {showSessionDropdown && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '26px',
                          width: '180px',
                          background: 'var(--surface)',
                          border: '1.5px solid var(--border-soft)',
                          borderRadius: '6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          zIndex: 999,
                          padding: '4px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}>
                          <div style={{
                            padding: '4px 8px',
                            fontSize: '7.5px',
                            fontWeight: 800,
                            color: 'var(--muted)',
                            borderBottom: '1px solid var(--border-soft)',
                            textTransform: 'uppercase',
                            marginBottom: '2px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}>
                            <span>Chat Sessions</span>
                            <span style={{ 
                              fontSize: '7px', 
                              color: customApiKey ? 'var(--status-success)' : 'var(--status-warn)',
                              fontWeight: 800
                            }}>
                              ● {customApiKey ? 'READY' : 'NO KEY'}
                            </span>
                          </div>

                          <div style={{
                            maxHeight: '130px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1px'
                          }}>
                            {sessions.map((s) => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  handleSelectSession(s.id);
                                  setShowSessionDropdown(false);
                                }}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  background: s.id === activeSessionId ? 'rgba(var(--accent-rgb, 99, 102, 241), 0.15)' : 'transparent',
                                  color: s.id === activeSessionId ? 'var(--accent)' : 'var(--text)',
                                  fontSize: '8.5px',
                                  fontWeight: s.id === activeSessionId ? 800 : 500,
                                  cursor: 'pointer',
                                  transition: 'all 0.15s'
                                }}
                              >
                                <span style={{
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '125px'
                                }}>
                                  {s.name}
                                </span>

                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteSession(s.id);
                                  }}
                                  style={{
                                    fontSize: '9px',
                                    opacity: 0.6,
                                    padding: '2px',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '12px',
                                    height: '12px',
                                    borderRadius: '50%'
                                  }}
                                  title="Delete Session"
                                >
                                  ✕
                                </span>
                              </div>
                            ))}
                          </div>

                          <div style={{
                            height: '1px',
                            background: 'var(--border-soft)',
                            margin: '2px 0'
                          }} />

                          <button
                            onClick={() => {
                              handleCreateSession();
                              setShowSessionDropdown(false);
                            }}
                            style={{
                              padding: '5px 8px',
                              borderRadius: '4px',
                              background: 'var(--surface-alt)',
                              color: 'var(--accent)',
                              border: '1px dashed var(--accent)',
                              fontSize: '8.5px',
                              fontWeight: 800,
                              cursor: 'pointer',
                              textAlign: 'center',
                              transition: 'all 0.15s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              width: '100%'
                            }}
                          >
                            {dtxt.btnNewSession}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Agent Interface */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                    {/* Chat Messages */}
                    <div
                      dir={agentLang === 'AR' || uiLang === 'AR' ? 'rtl' : 'ltr'}
                      style={{
                        flex: 1,
                        overflowY: 'auto',
                        border: '1.5px solid var(--border-soft)',
                        background: 'var(--surface-alt)',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        marginBottom: '8px',
                        minHeight: 0
                      }}
                    >
                      {/* Container Execution Cold-Start Notice Banner */}
                      <AgentExecutionNotice tenantId={user?.id || activeEntity || 'usr-123'} containerState={isChatLoading ? 'waking_up' : 'warm'} />

                      {chatHistory.map((h, index) => (
                        <div
                          key={index}
                          style={{
                            alignSelf: h.sender === 'user' ? 'flex-end' : 'flex-start',
                            width: 'auto',
                            maxWidth: '90%',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                        >
                          <span style={{ 
                            fontSize: '7.5px', 
                            fontWeight: 700, 
                            color: 'var(--muted)',
                            alignSelf: h.sender === 'user' ? 'flex-end' : 'flex-start',
                            padding: '0 4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.02em'
                          }}>
                            {h.sender === 'user' ? dtxt.userLabel : dtxt.assistantLabel}
                          </span>
                          
                          <div
                            style={{
                              background: h.sender === 'user' ? 'linear-gradient(135deg, var(--accent), #e59320)' : 'var(--surface)',
                              color: h.sender === 'user' ? 'var(--accent-contrast)' : 'var(--text)',
                              border: h.sender === 'user' ? '1px solid var(--border)' : '1.5px solid var(--border-soft)',
                              borderRadius: h.sender === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              padding: '8px 12px',
                              fontSize: '9.5px',
                              lineHeight: 1.45,
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          >
                            {h.sender === 'user' ? (
                              <div style={{ whiteSpace: 'pre-wrap' }}>{h.text}</div>
                            ) : (
                              renderChatMessage(h.text)
                            )}
                          </div>
                        </div>
                      ))}
                      {isChatLoading && (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].sender !== 'agent') && (
                        <div style={{ alignSelf: 'flex-start', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '6px', 
                            padding: '0 4px', 
                            alignSelf: 'flex-start' 
                          }}>
                            <span style={{ 
                              fontSize: '7.5px', 
                              fontWeight: 800, 
                              color: 'var(--accent)', 
                              textTransform: 'uppercase', 
                              letterSpacing: '0.02em' 
                            }}>
                              {dtxt.assistantLabel}
                            </span>
                            <span style={{
                              fontSize: '7px',
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'rgba(56, 189, 248, 0.12)',
                              color: '#38bdf8',
                              border: '1px solid rgba(56, 189, 248, 0.3)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px'
                            }}>
                              <span style={{ fontSize: '8px', animation: 'spin 1.5s linear infinite' }}>⚙️</span> STATUS: THINKING
                            </span>
                          </div>
                          <div style={{
                            alignSelf: 'flex-start',
                            background: 'var(--surface)',
                            border: '1.5px solid rgba(56, 189, 248, 0.3)',
                            borderRadius: '12px 12px 12px 2px',
                            padding: '10px 14px',
                            fontSize: '9.5px',
                            color: 'var(--text-bright)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            boxShadow: 'var(--shadow-sm)'
                          }}>
                            <span>{dtxt.thinkingLabel}</span>
                            <span className="thinking-dots" style={{ display: 'inline-flex', gap: '1px', fontWeight: 900, color: 'var(--accent)' }}>
                              <span style={{ animation: 'thinkingDot 1.4s infinite both', animationDelay: '0s' }}>.</span>
                              <span style={{ animation: 'thinkingDot 1.4s infinite both', animationDelay: '0.2s' }}>.</span>
                              <span style={{ animation: 'thinkingDot 1.4s infinite both', animationDelay: '0.4s' }}>.</span>
                            </span>
                          </div>
                        </div>
                      )}
                      <div ref={chatBottomRef} />
                    </div>



                    {/* 3 Agent Suggestion Cards (1 Top Card + 2 Grid Cards) */}
                    <div style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {(() => {
                        const baseDefaults = pbSuggestions;
                        let displayList: Array<{ title: string; icon: string; prompt: string; desc: string }> = [];

                        if (agentSuggestions && agentSuggestions.length > 0) {
                          displayList = agentSuggestions.map((s: any, idx: number) => {
                            if (typeof s === 'object' && s !== null) {
                              const promptVal = s.prompt || s.description || s.desc || s.title || '';
                              const descVal = s.desc || s.description || (s.prompt && s.prompt !== s.title ? s.prompt : '') || s.title || promptVal;
                              return {
                                title: s.title || s.name || `Option ${idx + 1}`,
                                icon: s.icon || '⚡',
                                prompt: promptVal,
                                desc: descVal
                              };
                            }
                            const strVal = String(s);
                            return {
                              title: `Option ${idx + 1}`,
                              icon: '⚡',
                              prompt: strVal,
                              desc: strVal
                            };
                          });
                        }

                        // Always pad with base defaults to guarantee at least 3 cards
                        if (displayList.length < 3) {
                          const missingCount = 3 - displayList.length;
                          for (let i = 0; i < missingCount; i++) {
                            if (baseDefaults[i]) {
                              displayList.push(baseDefaults[i]);
                            }
                          }
                        }

                        const items = displayList.slice(0, 3);
                        const topCard = items[0];
                        const bottomCards = items.slice(1, 3);

                        return (
                          <>
                            {/* Top Suggestion Card (3rd card placed above - 2 lines layout) */}
                            {topCard && (
                              <button
                                onClick={() => { setChatMessage(topCard.prompt); }}
                                title={`${topCard.title}${topCard.desc ? ': ' + topCard.desc : ''}`}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  justify: 'center',
                                  alignItems: 'flex-start',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  background: 'var(--surface-alt)',
                                  border: '1px solid var(--border-soft)',
                                  color: 'var(--text)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s',
                                  textAlign: 'left',
                                  gap: '2px',
                                  width: '100%',
                                  minWidth: 0,
                                  overflow: 'hidden'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', minWidth: 0 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, overflow: 'hidden' }}>
                                    <span style={{ fontSize: '9px', flexShrink: 0 }}>{topCard.icon || '⚡'}</span>
                                    <span style={{ fontWeight: 800, fontSize: '8.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--accent)', flex: 1, minWidth: 0 }}>
                                      {topCard.title}
                                    </span>
                                  </div>
                                  <span style={{ fontSize: '8px', color: 'var(--accent)', fontWeight: 800, flexShrink: 0, marginLeft: '4px' }}>⚡</span>
                                </div>
                                {topCard.desc && (
                                  <span style={{ fontSize: '7.5px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', minWidth: 0, lineHeight: 1.2 }}>
                                    {topCard.desc}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* 2 Cards Grid underneath */}
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'repeat(2, 1fr)', 
                              gap: '5px'
                            }}>
                              {bottomCards.map((s, idx) => (
                                <button
                                  key={idx}
                                  onClick={() => { setChatMessage(s.prompt); }}
                                  title={`${s.title}${s.desc ? ': ' + s.desc : ''}`}
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justify: 'center',
                                    alignItems: 'flex-start',
                                    padding: '5px 7px',
                                    borderRadius: '6px',
                                    background: 'var(--surface-alt)',
                                    border: '1px solid var(--border-soft)',
                                    color: 'var(--text)',
                                    cursor: 'pointer',
                                    transition: 'all 0.15s',
                                    textAlign: 'left',
                                    gap: '2px',
                                    minWidth: 0,
                                    overflow: 'hidden'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%', minWidth: 0 }}>
                                    <span style={{ fontSize: '9px', flexShrink: 0 }}>{s.icon || '🤖'}</span>
                                    <span style={{ fontWeight: 800, fontSize: '8.5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--accent)', flex: 1, minWidth: 0 }}>
                                      {s.title}
                                    </span>
                                  </div>
                                  {s.desc && (
                                    <span style={{ fontSize: '7.5px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%', minWidth: 0, lineHeight: 1.2 }}>
                                      {s.desc}
                                    </span>
                                  )}
                                </button>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    {/* Chat Input Top Border Divider */}
                    <div
                      style={{
                        width: '100%',
                        height: '1px',
                        background: 'var(--border-soft)',
                        marginTop: '4px',
                        marginBottom: '4px',
                      }}
                    />
                    {/* Plan 1.1-B: Attached Extra Context Chips */}
                      {selectedExtraSources.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
                          {selectedExtraSources.map((item) => (
                            <div
                              key={item.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                background: 'rgba(99, 102, 241, 0.12)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: 'var(--accent)',
                                fontSize: '8.5px',
                                fontWeight: 800
                              }}
                            >
                              <span>{item.type === 'file' ? '📄' : item.type === 'mission' ? '🎯' : '📦'}</span>
                              <span style={{ maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.label}</span>
                              <button
                                type="button"
                                onClick={() => setSelectedExtraSources(prev => prev.filter(i => i.id !== item.id))}
                                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '9px', padding: '0 2px' }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <textarea
                        id="agent-chat-textarea"
                        placeholder={dtxt.chatPlaceholder}
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        onKeyDown={(e) => {
                          // Shift+Enter sends message, Enter inserts a new line
                          if (e.key === 'Enter' && e.shiftKey) {
                            e.preventDefault();
                            handleSendChat();
                          }
                        }}
                        onMouseUp={(e) => {
                          const target = e.currentTarget;
                          if (target && target.offsetHeight) {
                            const newH = Math.round(target.offsetHeight);
                            if (newH !== chatInputHeight) {
                              setChatInputHeight(newH);
                              saveLayoutConfig(minCenter, minSide, leftTab, newH);
                            }
                          }
                        }}
                        style={{
                          width: '100%',
                          minHeight: '96px',
                          height: `${Math.max(96, chatInputHeight)}px`,
                          maxHeight: '320px',
                          resize: 'vertical',
                          background: 'var(--surface-alt)',
                          border: '1.5px solid var(--border-soft)',
                          borderRadius: '6px',
                          color: 'var(--text)',
                          fontSize: '12px',
                          padding: '10px 12px',
                          outline: 'none',
                          boxSizing: 'border-box',
                          fontFamily: 'inherit',
                          lineHeight: '1.45',
                          display: 'block'
                        }}
                      />
                    </div>

                    {/* Controls Toolbar (Commands Button, Context Window Usage Bar, Autonomy Switcher, Agent Output Lang Switcher, Internet Icon, Send Button) - Line 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px', flexShrink: 0, flexWrap: 'nowrap' }}>
                      {/* Left: Commands Button, Context Window Usage Bar, Autonomy Switcher & Agent Output Language Switcher */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, flexShrink: 1, overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {/* Pi Agent CLI /commands Button */}
                        <div style={{ flexShrink: 0 }}>
                          <button
                            ref={commandsBtnRef}
                            onClick={(e) => toggleCommandsMenu(e)}
                            title="View & execute Pi Agent CLI commands (/commands)"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '3px',
                              background: showCommandsMenu ? 'rgba(99, 102, 241, 0.22)' : 'var(--surface-alt)',
                              border: `1px solid ${showCommandsMenu ? 'var(--accent)' : 'var(--border-soft)'}`,
                              borderRadius: '4px',
                              padding: '1px 5px',
                              height: '18px',
                              fontSize: '7.5px',
                              fontFamily: 'var(--mono)',
                              fontWeight: 800,
                              color: showCommandsMenu ? 'var(--accent)' : 'var(--text-bright)',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                              boxShadow: showCommandsMenu ? '0 0 8px rgba(99, 102, 241, 0.3)' : 'none'
                            }}
                          >
                            <span style={{ color: 'var(--accent)', fontSize: '8px' }}>⚡</span>
                            <span>/commands</span>
                            <span style={{ fontSize: '6.5px', opacity: 0.7 }}>{showCommandsMenu ? '▲' : '▼'}</span>
                          </button>

                          {/* Dropdown Popup Menu */}
                          {showCommandsMenu && (
                            <>
                              <div
                                onClick={() => setShowCommandsMenu(false)}
                                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99998 }}
                              />
                              <div
                                style={{
                                  position: 'fixed',
                                  bottom: `${commandsMenuCoords.bottom}px`,
                                  left: `${commandsMenuCoords.left}px`,
                                  width: '300px',
                                  maxHeight: '350px',
                                  background: 'var(--surface)',
                                  border: '1.5px solid var(--border-soft)',
                                  borderRadius: '8px',
                                  boxShadow: '0 16px 48px rgba(0, 0, 0, 0.8)',
                                  zIndex: 99999,
                                  display: 'flex',
                                  flexDirection: 'column',
                                  overflow: 'hidden',
                                  fontFamily: 'var(--mono)'
                                }}
                              >
                                <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border-soft)', background: 'var(--surface-alt)' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                      <span style={{ fontSize: '11px', color: 'var(--accent)' }}>⚡</span>
                                      <span style={{ fontSize: '9.5px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                        Pi CLI Commands
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '7.5px', color: 'var(--muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 5px', borderRadius: '3px' }}>
                                      14 available
                                    </span>
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Search /commands..."
                                    value={commandSearch}
                                    onChange={(e) => setCommandSearch(e.target.value)}
                                    autoFocus
                                    style={{
                                      width: '100%',
                                      background: 'rgba(0,0,0,0.2)',
                                      border: '1px solid var(--border-soft)',
                                      borderRadius: '4px',
                                      padding: '4px 8px',
                                      fontSize: '9px',
                                      color: 'var(--text-bright)',
                                      fontFamily: 'var(--mono)',
                                      outline: 'none',
                                      boxSizing: 'border-box'
                                    }}
                                  />
                                </div>

                                <div style={{ overflowY: 'auto', padding: '4px', flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  {[
                                    { cmd: '/help', icon: '⚡', desc: 'Display Pi Agent CLI command guide and usage overview' },
                                    { cmd: '/clear', icon: '🧹', desc: 'Reset conversation session and clear context window' },
                                    { cmd: '/compact', icon: '📦', desc: 'Compact context history to optimize token memory' },
                                    { cmd: '/stats', icon: '📊', desc: 'Display live token consumption & context metrics' },
                                    { cmd: '/models', icon: '🤖', desc: 'List available LLM models & key pool providers' },
                                    { cmd: '/model gemini-2.5-flash', icon: '🎯', desc: 'Switch active model (e.g. /model gemini-2.5-flash)' },
                                    { cmd: '/skills', icon: '🧠', desc: 'List active Fabrica kernel skills & behavioral rules' },
                                    { cmd: '/extensions', icon: '🔌', desc: 'View registered system prompt integrations & hooks' },
                                    { cmd: '/system', icon: '📜', desc: 'Inspect active AGENTS.md system directives & context' },
                                    { cmd: '/reload', icon: '🔄', desc: 'Reload skills, integrations & AGENTS.md directives' },
                                    { cmd: '/sessions', icon: '🗂️', desc: 'List active Pi Agent CLI workspace sessions' },
                                    { cmd: '/web', icon: '🌐', desc: 'Toggle real-time web search grounding mode' },
                                    { cmd: '/export', icon: '📥', desc: 'Export full execution session transcript & logs' },
                                    { cmd: '/stop', icon: '🛑', desc: 'Stop active agent execution process' }
                                  ].filter(c => 
                                    c.cmd.toLowerCase().includes(commandSearch.toLowerCase()) || 
                                    c.desc.toLowerCase().includes(commandSearch.toLowerCase())
                                  ).map((item) => (
                                    <button
                                      key={item.cmd}
                                      onClick={() => {
                                        setShowCommandsMenu(false);
                                        setCommandSearch('');
                                        if (item.cmd === '/stop') {
                                          setIsAgentActive(false);
                                        } else {
                                          handleSendChat(item.cmd);
                                        }
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'flex-start',
                                        gap: '8px',
                                        padding: '6px 8px',
                                        background: 'transparent',
                                        border: '1px solid transparent',
                                        borderRadius: '5px',
                                        textAlign: 'left',
                                        cursor: 'pointer',
                                        width: '100%',
                                        transition: 'background 0.12s, border 0.12s',
                                        outline: 'none'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(99, 102, 241, 0.12)';
                                        e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'transparent';
                                        e.currentTarget.style.borderColor = 'transparent';
                                      }}
                                    >
                                      <span style={{ fontSize: '11px', flexShrink: 0, marginTop: '1px' }}>{item.icon}</span>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                                          <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--accent)' }}>{item.cmd}</span>
                                          <span style={{ fontSize: '7px', color: 'var(--muted)', background: 'rgba(255,255,255,0.04)', padding: '1px 4px', borderRadius: '3px', flexShrink: 0 }}>SEND ↵</span>
                                        </div>
                                        <span style={{ fontSize: '7.5px', color: 'var(--muted)', lineHeight: '1.25', whiteSpace: 'normal', wordBreak: 'word-break' }}>
                                          {item.desc}
                                        </span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Agent Output Language Dropdown */}
                        <div style={{ flex: '0 0 auto', flexShrink: 0 }}>
                          <select
                            value={agentLang}
                            onChange={(e) => handleAgentLangChange(e.target.value as 'EN' | 'FR' | 'AR')}
                            title="Agent Output Language"
                            style={{
                              height: '18px',
                              background: 'var(--surface-alt)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              color: 'var(--text-bright)',
                              fontSize: '7.5px',
                              fontFamily: 'var(--mono)',
                              fontWeight: 800,
                              padding: '0 4px',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="EN">🗣️ EN</option>
                            <option value="FR">🗣️ FR</option>
                            <option value="AR">🗣️ AR</option>
                          </select>
                        </div>

                        {/* Agent Thinking Level Dropdown (between Output Language and Internet Icon) */}
                        <div style={{ flex: '0 0 auto', flexShrink: 0 }}>
                          <select
                            value={thinkingLevel}
                            onChange={(e) => {
                              const v = e.target.value as typeof thinkingLevel;
                              setThinkingLevel(v);
                              localStorage.setItem('fabrica_thinking_level', v);
                            }}
                            title="Agent Thinking Level (--thinking)"
                            style={{
                              height: '18px',
                              background: thinkingLevel !== 'off' ? 'rgba(139,92,246,0.12)' : 'var(--surface-alt)',
                              border: thinkingLevel !== 'off' ? '1px solid rgba(139,92,246,0.5)' : '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              color: thinkingLevel !== 'off' ? '#8b5cf6' : 'var(--text-bright)',
                              fontSize: '7.5px',
                              fontFamily: 'var(--mono)',
                              fontWeight: 800,
                              padding: '0 4px',
                              cursor: 'pointer',
                              outline: 'none'
                            }}
                          >
                            <option value="off">🧠 THK OFF</option>
                            <option value="minimal">🧠 MIN</option>
                            <option value="low">🧠 LOW</option>
                            <option value="medium">🧠 MED</option>
                            <option value="high">🧠 HIGH</option>
                            <option value="xhigh">🧠 XHIGH</option>
                            <option value="max">🧠 MAX</option>
                          </select>
                        </div>

                        {/* Internet / Web Search Toggle Button */}
                        <button
                          type="button"
                          onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                          title={webSearchEnabled ? "Web Search Grounding (Internet Access) ENABLED" : "Web Search Grounding (Internet Access) DISABLED"}
                          style={{
                            height: '18px',
                            padding: '1px 5px',
                            fontSize: '7.5px',
                            fontFamily: 'var(--mono)',
                            fontWeight: 800,
                            borderRadius: '4px',
                            border: webSearchEnabled ? '1px solid #10b981' : '1px solid var(--border-soft)',
                            background: webSearchEnabled ? 'rgba(16, 185, 129, 0.15)' : 'var(--surface-alt)',
                            color: webSearchEnabled ? '#10b981' : 'var(--text-bright)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            flexShrink: 0,
                            transition: 'all 0.15s'
                          }}
                        >
                          <span style={{ fontSize: '8.5px' }}>🌐</span>
                          <span>{webSearchEnabled ? 'WEB ON' : 'WEB OFF'}</span>
                        </button>

                        {/* Plan 1.1-B: + Context Picker Button */}
                        <button
                          type="button"
                          onClick={() => setIsContextPickerOpen(true)}
                          title="Attach extra context (Files, Missions, Workspace Data Assets)"
                          style={{
                            height: '18px',
                            width: '18px',
                            padding: 0,
                            fontSize: '11px',
                            fontWeight: 900,
                            borderRadius: '4px',
                            border: contextPickerAttachedItems.length > 0 ? '1.5px solid var(--accent)' : '1px solid var(--border-soft)',
                            background: contextPickerAttachedItems.length > 0 ? 'rgba(99, 102, 241, 0.15)' : 'var(--surface-alt)',
                            color: contextPickerAttachedItems.length > 0 ? 'var(--accent)' : 'var(--text-bright)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          +
                        </button>

                        {isChatLoading ? (
                          <button
                            type="button"
                            className="mini danger"
                            style={{
                              height: '22px',
                              padding: '0 10px',
                              fontWeight: 800,
                              fontSize: '9.5px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleStopChat();
                            }}
                            title="Stop agent turn & halt process"
                          >
                            <span>{dtxt.stopBtn || "Stop"}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="mini accent"
                            style={{
                              height: '22px',
                              padding: '0 10px',
                              fontWeight: 800,
                              fontSize: '9.5px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxSizing: 'border-box',
                              flexShrink: 0
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleSendChat();
                            }}
                          >
                            <span>{dtxt.sendBtn}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
            </div>

            {/* Start Agent Overlay */}
            {!isAgentInitialized && (
              <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(var(--surface-rgb, 15, 23, 42), 0.72)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                gap: '12px'
              }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(16, 185, 129, 0.25))',
                  border: '1.5px solid var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  boxShadow: '0 0 24px rgba(99, 102, 241, 0.35)'
                }}>
                  🤖
                </div>

                <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '0.02em' }}>
                  User Container & Agent Not Started
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '9.5px',
                  fontFamily: 'var(--mono)',
                  color: '#34d399'
                }}>
                  <span>📦</span>
                  <span>User Container: <code>fabrica-runner-{(user?.id || 'default_user').replace(/[^a-zA-Z0-9_\-]/g, '-').toLowerCase()}</code></span>
                </div>

                <div style={{ fontSize: '10.5px', color: 'var(--muted)', maxWidth: '280px', lineHeight: 1.5 }}>
                  Click below to boot your dedicated Cloud Run container instance, start the Agent Runner process, connect to <code>.pi/</code> extensions, and enable autonomous execution.
                </div>

                <button
                  onClick={handleStartAgent}
                  disabled={isStartingAgent}
                  style={{
                    marginTop: '8px',
                    padding: '10px 24px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, var(--accent), #10b981)',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: 800,
                    cursor: isStartingAgent ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {isStartingAgent ? (
                    <>
                      <span style={{ fontSize: '12px', display: 'inline-block', animation: 'spin 1.5s linear infinite' }}>⚙️</span>
                      <span>Booting User Container & Agent Server...</span>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: '12px' }}>⚡</span>
                      <span>Start User Container & Agent</span>
                    </>
                  )}
                </button>
              </div>
            )}
        </section>
      </aside>

        {/* ============ CENTER & RIGHT CONTAINER WITH TOP-BAR ============ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
          
          {/* ============ GLOBAL TOP-BAR ABOVE MISSIONS & RIGHT PANEL ============ */}
          <div style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            padding: '2px 8px',
            height: '28px',
            minHeight: '28px',
            maxHeight: '28px',
            boxSizing: 'border-box',
            background: 'var(--surface-alt)',
            borderBottom: '1px solid var(--border-soft)',
            flexShrink: 0
          }}>
            {/* Left Title / Workspace Info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '8.5px', fontWeight: 900, color: 'var(--text-bright)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                🚀 FABRICA WORKSPACE HQ
              </span>
              <ContainerStatusBadge tenantId={user?.id || activeEntity || 'usr-123'} />
            </div>

            {/* Right Group: Persistent Actions (Theme, Language, Logs, Account & API) + Minimize Pad */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              {/* Theme Icon */}
              <button 
                className="theme-toggle" 
                onClick={toggleTheme} 
                title={dtxt.themeTitle} 
                style={{ 
                  height: '18px', 
                  width: '18px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontSize: '8px',
                  padding: '0',
                  flexShrink: 0
                }}
              >
                {theme === 'dark' ? '☀' : '☾'}
              </button>

              {/* UI Language Dropdown */}
              <select
                value={uiLang}
                onChange={(e) => handleUiLangChange(e.target.value as 'EN' | 'FR' | 'AR')}
                title={dtxt.langTitle}
                style={{
                  height: '18px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  borderRadius: '3px',
                  color: 'var(--text)',
                  fontSize: '7.5px',
                  fontWeight: 800,
                  padding: '0 3px',
                  cursor: 'pointer',
                  outline: 'none',
                  flexShrink: 0
                }}
              >
                <option value="EN">🌐 EN</option>
                <option value="FR">🌐 FR</option>
                <option value="AR">🌐 AR</option>
              </select>

              {/* Logs Button */}
              <button
                onClick={() => setIsLogsWindowOpen(true)}
                style={{
                  padding: '0 4px',
                  fontSize: '7.5px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border-soft)',
                  color: 'var(--text-bright)',
                  height: '18px',
                  cursor: 'pointer',
                  borderRadius: '3px',
                  flexShrink: 0
                }}
                title="Open System & Realtime Execution Logs"
              >
                <span>📟</span>
                <span>Logs</span>
              </button>

              {/* Account & API Button */}
              <div
                style={{ position: 'relative' }}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setAccountHoverPos({
                    top: rect.bottom + 6,
                    right: Math.max(8, window.innerWidth - rect.right)
                  });
                  setIsAccountHoverOpen(true);
                }}
                onMouseLeave={() => setIsAccountHoverOpen(false)}
              >
                <button
                  onClick={() => setIsAccountWindowOpen(true)}
                  style={{
                    padding: '0 5px',
                    fontSize: '7.5px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    border: 'none',
                    color: '#fff',
                    height: '18px',
                    cursor: 'pointer',
                    borderRadius: '3px',
                    flexShrink: 0
                  }}
                  title="Manage Account, Workspace & API Keys"
                >
                  <span>🔑</span>
                  <span>Account & API</span>
                </button>

                {/* Hover Small Window for Current Plan, Usage Quota, Token Alerts & Token Billing/Routing Method */}
                {isAccountHoverOpen && (
                  <div
                    style={{
                      position: 'fixed',
                      top: `${accountHoverPos.top}px`,
                      right: `${accountHoverPos.right}px`,
                      width: '290px',
                      background: 'var(--surface)',
                      border: '1.5px solid #3b82f6',
                      borderRadius: '8px',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                      padding: '12px',
                      zIndex: 99999,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      pointerEvents: 'none'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-soft)', paddingBottom: '4px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase' }}>
                        📊 Tier & Quota Overview
                      </span>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.15)', padding: '1px 6px', borderRadius: '3px' }}>
                        {selectedPlan ? `${selectedPlan.toUpperCase()} PLAN` : 'FREE SHARED TIER'}
                      </span>
                    </div>

                    {/* Real User Tenant Space ID */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '8px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', padding: '4px 6px', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--muted)', fontWeight: 700 }}>TENANT SPACE ID:</span>
                      <span style={{ fontFamily: 'var(--mono)', color: '#6366f1', fontWeight: 800, fontSize: '8px' }}>
                        {user?.id ? user.id : (activeEntity || 'sandbox-default-local')}
                      </span>
                    </div>

                    {/* Quota & Token Alerts Preview */}
                    {(() => {
                      const q = getQuotaMetrics(userTierData);
                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px' }}>
                            <span style={{ color: 'var(--muted)', fontWeight: 700 }}>USAGE QUOTA:</span>
                            <span style={{ color: 'var(--text)', fontWeight: 800 }}>{q.percentUsed}% ({q.usedTokensThisMonth.toLocaleString()} / {q.monthlyQuotaTokens.toLocaleString()})</span>
                          </div>
                          <div style={{ height: '6px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${q.percentUsed}%`, height: '100%', background: q.statusColor }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                            <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>TOKEN ALERTS:</span>
                            <span style={{ fontSize: '7.5px', fontWeight: 800, color: q.statusColor }}>
                              {q.percentUsed > 90 ? '🚨 CRITICAL ALERT (<10% REMAINING)' : q.percentUsed > 75 ? '⚠️ QUOTA WARNING' : '✓ HEALTHY ALLOCATION'}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Active TOKEN BILLING & ROUTING METHOD */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', padding: '6px 8px', borderRadius: '5px' }}>
                      <div style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        ⚡ Active Token Billing & Routing Method
                      </div>
                      <div style={{ fontSize: '8.5px', fontWeight: 800, color: customApiKey ? '#10b981' : '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>{customApiKey ? '🔑 Direct BYOK (Custom Gemini Key)' : '🌐 Fabrica Shared API Credit Proxy'}</span>
                      </div>
                    </div>

                    <div style={{ fontSize: '7.5px', color: 'var(--muted)', borderTop: '1px solid var(--border-soft)', paddingTop: '4px' }}>
                      💡 Click button to manage Account, Workspace & BYOK Credentials.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ============ MAIN WORKSPACE ROW: MISSIONS HQ (CENTER) + LIVE APP PREVIEW (RIGHT) ============ */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
            
            {/* ============ CENTER COLUMN: MISSIONS HQ BOARD & ARTIFACTS/PROJECTS ============ */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
              
              {/* ============ TOP SECTION: MISSIONS HQ BOARD ============ */}
              <div style={{
                flex: minCenter ? '0 0 auto' : (minBottomVertical ? '1 1 100%' : '1 1 50%'),
                minHeight: minCenter ? '36px' : '200px',
                maxHeight: minCenter ? '36px' : 'none',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                borderBottom: '1px solid var(--border-soft)',
                transition: 'all 0.2s ease'
              }}>
                <section className="col top" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <div className="pane" style={{ flex: 1, padding: 0, gap: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: 'none' }}>
                
                {/* Mission bar switcher & controls in a single row */}
                <div 
                  className="mhq-bar" 
                  onClick={minCenter ? () => toggleMissionsVertical(false) : undefined}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    gap: '4px', 
                    padding: '2px 8px', 
                    height: '28px', 
                    minHeight: '28px', 
                    maxHeight: '28px', 
                    boxSizing: 'border-box', 
                    flexWrap: 'nowrap', 
                    overflowX: 'hidden', 
                    background: 'var(--surface-alt)', 
                    borderBottom: '1px solid var(--border-soft)',
                    cursor: minCenter ? 'pointer' : 'default'
                  }}
                >
                  
                  {/* Left Group: Specified order (New - Pipeline Config - sort - search - priorities - types) OR metrics when minimized */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 1, minWidth: 0, overflowX: 'auto', padding: '0px' }}>
                    {minCenter ? (
                      <div
                        onClick={() => toggleMissionsVertical(false)}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', flex: 1, overflow: 'hidden' }}
                        title="Click to expand Missions HQ"
                      >
                        <span style={{ fontSize: '7.5px', fontWeight: 900, background: 'var(--accent)', color: '#ffffff', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                          MISSIONS HQ
                        </span>
                        <span style={{ fontSize: '8.5px', fontWeight: 900, color: 'var(--text-bright)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                          🎯 {filteredMissions.length} MISSIONS ({mDraft.length} Draft • {mPlan.length} Plan • {mExec.length} Execution • {mArchive.length} Delivered | {filteredMissions.filter(m => m.priority === 'CRITICAL' || m.priority === 'HIGH').length} High Priority)
                        </span>
                      </div>
                    ) : (
                      <>
                        {/* 1. New */}
                        <button
                          onClick={() => setIsAddMissionOpen(true)}
                          title="Register New Mission"
                          style={{
                            height: '18px',
                            padding: '0 4px',
                            fontSize: '7.5px',
                            fontWeight: 900,
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: '1px solid #10b981',
                            color: '#ffffff',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '2px',
                            lineHeight: '1',
                            flexShrink: 0,
                            boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)'
                          }}
                        >
                          <span style={{ fontSize: '8px' }}>✨</span>
                          <span>{dtxt.btnNewMission}</span>
                        </button>

                        {/* 2. Pipeline Config */}
                        <button
                          onClick={() => setIsGatesModalOpen(true)}
                          title="Configure Approval Gates & Loop EFFORT Parameters"
                          style={{
                            height: '18px',
                            padding: '0 4px',
                            fontSize: '7.5px',
                            fontWeight: 800,
                            background: 'rgba(59, 130, 246, 0.15)',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            color: '#3b82f6',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '2px',
                            lineHeight: '1',
                            flexShrink: 0
                          }}
                        >
                          <span style={{ fontSize: '8px' }}>⚙️</span>
                          <span>Pipeline Config</span>
                        </button>

                        {/* 3. Sort */}
                        <select
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border-soft)',
                            borderRadius: '3px',
                            color: 'var(--text-secondary)',
                            fontSize: '7px',
                            fontWeight: 700,
                            padding: '0 2px',
                            outline: 'none',
                            cursor: 'pointer',
                            height: '18px',
                            maxWidth: '65px',
                            flexShrink: 0
                          }}
                          value={sortOption}
                          onChange={(e) => setSortOption(e.target.value)}
                        >
                          <option value="default">Sort: Default</option>
                          <option value="name">Sort: Name</option>
                          <option value="priority">Sort: Priority</option>
                        </select>

                        {/* 4. Search */}
                        <div className="mhq-search" style={{ height: '18px', padding: '0 3px', gap: '2px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', display: 'flex', alignItems: 'center', flexShrink: 1, minWidth: '50px', maxWidth: '90px' }}>
                          <span style={{ fontSize: '7px', color: 'var(--muted)', flexShrink: 0 }}>⌕</span>
                          <input 
                            type="text" 
                            placeholder={dtxt.searchPlaceholder} 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                            style={{ fontSize: '7px', width: '100%', minWidth: 0, background: 'transparent', border: 'none', outline: 'none', padding: 0, height: '100%', color: 'var(--text-primary)' }}
                          />
                        </div>

                        {/* 5. Priorities */}
                        <select
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border-soft)',
                            borderRadius: '3px',
                            color: 'var(--text-secondary)',
                            fontSize: '7px',
                            fontWeight: 700,
                            padding: '0 2px',
                            outline: 'none',
                            cursor: 'pointer',
                            height: '18px',
                            maxWidth: '65px',
                            flexShrink: 0
                          }}
                          value={prioFilter}
                          onChange={(e) => setPrioFilter(e.target.value)}
                        >
                          <option value="ALL">{dtxt.allPriorities}</option>
                          <option value="CRITICAL">CRITICAL</option>
                          <option value="HIGH">HIGH</option>
                          <option value="MEDIUM">MEDIUM</option>
                          <option value="LOW">LOW</option>
                        </select>

                        {/* 6. Types */}
                        <select
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border-soft)',
                            borderRadius: '3px',
                            color: 'var(--text-secondary)',
                            fontSize: '7px',
                            fontWeight: 700,
                            padding: '0 2px',
                            outline: 'none',
                            cursor: 'pointer',
                            height: '18px',
                            maxWidth: '75px',
                            flexShrink: 0
                          }}
                          value={typeFilter}
                          onChange={(e) => setTypeFilter(e.target.value)}
                        >
                          <option value="ALL">{dtxt.allTypes || 'All Types'}</option>
                          <option value="standard">{getCategoryLabel('standard')}</option>
                          <option value="full_pipeline">{getCategoryLabel('full_pipeline')}</option>
                          <option value="quick_pipeline">{getCategoryLabel('quick_pipeline')}</option>
                          <option value="custom_entry_pipeline">{getCategoryLabel('custom_entry_pipeline')}</option>
                          <option value="custom_selection_pipeline">{getCategoryLabel('custom_selection_pipeline')}</option>
                        </select>
                      </>
                    )}
                  </div>

                  {/* Minimize icon on the right of the missions top-bar */}
                  {!minCenter && (
                    <button
                      type="button"
                      onClick={() => toggleMissionsVertical(true)}
                      title="Minimize Missions section as topbar"
                      style={{
                        height: '20px',
                        minWidth: '20px',
                        padding: '0 5px',
                        fontSize: '9px',
                        fontWeight: 800,
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: '#38bdf8',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        marginLeft: 'auto'
                      }}
                    >
                      ▼
                    </button>
                  )}
                </div>

            {/* Main content viewport */}
            <div className="mhq-body" style={{ flex: 1, padding: '3px 4px', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', height: '100%', minHeight: 0 }}>
                  
                  {/* Drafting Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '2px', height: '22px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--muted)', fontFamily: 'var(--sans)' }}>Drafting ({mDraft.length})</span>
                      <select
                        value={draftingPhaseFilter}
                        onChange={(e) => setDraftingPhaseFilter(e.target.value)}
                        style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text-secondary)', fontSize: '7px', padding: '0px 2px', outline: 'none', cursor: 'pointer' }}
                        title="Filter Drafting Phase"
                      >
                        <option value="ALL">Phase: All</option>
                        <option value="discovery_scoping">Discovery & Scoping</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '2px' }}>
                      {mDraft.map(m => (
                        <div
                          key={m.id}
                          className={`mcard sm ${getPriorityClass(m.priority)}`}
                          onClick={() => handleSelectMission(m)}
                          style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s', padding: '3px 4px' }}
                        >
                          <div className="mcard-top">
                            <div className="mcard-title-group" style={{ width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px', width: '100%' }}>
                                <b className="mcard-title-text" style={{ fontSize: '7.5px', lineHeight: 1.15 }}>{m.id.replace(/_/g, ' ')}</b>
                                <span style={{ fontSize: '5.5px', fontWeight: 800, padding: '0.5px 2px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                  ⚡ {m.priority || 'MEDIUM'}
                                </span>
                              </div>
                              <span className="mcard-slug mono" style={{ fontSize: '5.5px', opacity: 0.8 }}>{m.id}</span>
                            </div>
                          </div>
                          <p className="mcard-desc" style={{ fontSize: '6.5px', margin: '0.5px 0', lineHeight: 1.2 }}>{m.objective}</p>
                          {m.target_stack && (
                            <div style={{ fontSize: '5.5px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                              🛠️ {m.target_stack}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', marginTop: '1px', alignItems: 'center' }}>
                            <span className="mcard-meta-badge model-badge" style={{ fontSize: '5.5px', padding: '0.5px 2px' }}>🧠 {getCategoryLabel(m.type || m.category)}</span>
                            <span style={{ fontSize: '5.5px', fontWeight: 800, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)', padding: '0.5px 2px', borderRadius: '2px' }}>
                              ⚡ {loopEfforts['discovery_scoping'] || 'Medium'} EFFORT
                            </span>
                            {approvalGates['discovery_scoping'] !== false && (
                              <span style={{ fontSize: '5.5px', fontWeight: 800, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.12)', padding: '0.5px 2px', borderRadius: '2px' }}>
                                🛡️ Gate On
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedMissionLogs({
                                  missionId: m.id,
                                  logs: [
                                    `[${new Date().toLocaleTimeString()}] 🚀 Initiating AI Agent Mission: ${m.id}`,
                                    `[${new Date().toLocaleTimeString()}] 🔄 Phase 1: Drafting (Discovery & Scoping Loop active)`,
                                    `[${new Date().toLocaleTimeString()}] ⚡ EFFORT Level set to: ${loopEfforts['discovery_scoping'] || 'Medium'}`,
                                    `[${new Date().toLocaleTimeString()}] 🛡️ User Approval Gate: ${approvalGates['discovery_scoping'] !== false ? 'ACTIVE (Awaiting user review)' : 'BYPASSED'}`,
                                    `[${new Date().toLocaleTimeString()}] 📥 Indexed linked Sources context items`,
                                    `[${new Date().toLocaleTimeString()}] 🧠 Agent synthesizing scoping trade-offs...`
                                  ]
                                });
                                setIsLogsModalOpen(true);
                              }}
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-soft)', color: 'var(--text-secondary)', fontSize: '6px', padding: '0.5px 3px', borderRadius: '2px', cursor: 'pointer' }}
                            >
                              📜 Logs
                            </button>
                            <button
                              className="mini accent"
                              style={{ fontSize: '6px', padding: '0.5px 3px' }}
                              onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'planning'); }}
                            >Plan ➔</button>
                          </div>
                        </div>
                      ))}
                      {mDraft.length === 0 && (
                        <div style={{
                          border: '1.5px dashed var(--border-soft)',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '8.5px',
                          color: 'var(--muted)',
                          fontFamily: 'var(--sans)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          background: 'rgba(255,255,255,0.015)'
                        }}>
                          <div style={{ fontSize: '16px', filter: 'grayscale(0.3) opacity(0.85)' }}>💡</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '9px' }}>No Drafting Items</div>
                          <p style={{ margin: 0, fontSize: '7.5px', color: 'var(--muted)', lineHeight: '1.2' }}>
                            Formulate a new strategic directive.
                          </p>
                          <button
                            onClick={() => setIsAddMissionOpen(true)}
                            style={{
                              fontSize: '7.5px',
                              fontWeight: 800,
                              background: 'var(--accent)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '3px',
                              padding: '2px 8px',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              marginTop: '2px',
                              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.25)'
                            }}
                          >
                            <span>✨</span>
                            <span>+ Draft New</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Planning Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '2px', height: '22px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--sans)' }}>{dtxt.colPlanning} ({mPlan.length})</span>
                      <select
                        value={planningPhaseFilter}
                        onChange={(e) => setPlanningPhaseFilter(e.target.value)}
                        style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text-secondary)', fontSize: '7px', padding: '0px 2px', outline: 'none', cursor: 'pointer' }}
                        title="Filter Planning Phase"
                      >
                        <option value="ALL">Phase: All</option>
                        <option value="deep_research">Deep Research</option>
                        <option value="data_analysis">Data Analysis</option>
                        <option value="strategic_synthesis">Strategic Synthesis</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '2px' }}>
                      {mPlan.map(m => (
                        <div
                          key={m.id}
                          className={`mcard sm ${getPriorityClass(m.priority)}`}
                          onClick={() => handleSelectMission(m)}
                          style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s', padding: '3px 4px' }}
                        >
                          <div className="mcard-top">
                            <div className="mcard-title-group" style={{ width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px', width: '100%' }}>
                                <b className="mcard-title-text" style={{ fontSize: '7.5px', lineHeight: 1.15 }}>{m.id.replace(/_/g, ' ')}</b>
                                <span style={{ fontSize: '5.5px', fontWeight: 800, padding: '0.5px 2px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', color: 'var(--accent)', whiteSpace: 'nowrap' }}>
                                  ⚡ {m.priority || 'HIGH'}
                                </span>
                              </div>
                              <span className="mcard-slug mono" style={{ fontSize: '5.5px', opacity: 0.8 }}>{m.id}</span>
                            </div>
                          </div>
                          <p className="mcard-desc" style={{ fontSize: '6.5px', margin: '0.5px 0', lineHeight: 1.2 }}>{m.objective}</p>
                          {m.phase === 'qa' && (
                            <div style={{ fontSize: '5.5px', color: '#f43f5e', background: 'rgba(244,63,94,0.08)', padding: '0.5px 2px', borderRadius: '2px', border: '1px solid rgba(244,63,94,0.2)' }}>
                              🛡️ QA Gating Active
                            </div>
                          )}
                          {m.target_stack && (
                            <div style={{ fontSize: '5.5px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                              🛠️ {m.target_stack}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
                            <span className="mcard-meta-badge model-badge" style={{ fontSize: '5.5px', padding: '0.5px 2px' }}>🧪 {getCategoryLabel(m.type || m.category)}</span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                className="mini ghost"
                                style={{ fontSize: '6px', padding: '0.5px 3px' }}
                                onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'drafting'); }}
                              >◀ Draft</button>
                              <button
                                className="mini accent"
                                style={{ fontSize: '6px', padding: '0.5px 3px' }}
                                onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'execution'); }}
                              >Launch ➔</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {mPlan.length === 0 && (
                        <div style={{
                          border: '1.5px dashed var(--border-soft)',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '8.5px',
                          color: 'var(--muted)',
                          fontFamily: 'var(--sans)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          background: 'rgba(255,255,255,0.015)'
                        }}>
                          <div style={{ fontSize: '16px', filter: 'grayscale(0.3) opacity(0.85)' }}>🧪</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '9px' }}>Planning Clear</div>
                          <p style={{ margin: 0, fontSize: '7.5px', color: 'var(--muted)', lineHeight: '1.2' }}>
                            No missions awaiting approval.
                          </p>
                          {mDraft.length > 0 && (
                            <div style={{ marginTop: '2px' }}>
                              <button
                                onClick={() => handleUpdateMissionStatus(mDraft[0], 'planning')}
                                style={{
                                  fontSize: '7.5px',
                                  fontWeight: 800,
                                  background: 'rgba(99, 102, 241, 0.12)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent)',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span>Promote ➔</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Execution Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '2px', height: '22px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#f59e0b', fontFamily: 'var(--sans)' }}>{dtxt.colExecution} ({mExec.length})</span>
                      <select
                        value={executionPhaseFilter}
                        onChange={(e) => setExecutionPhaseFilter(e.target.value)}
                        style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text-secondary)', fontSize: '7px', padding: '0px 2px', outline: 'none', cursor: 'pointer' }}
                        title="Filter Execution Phase"
                      >
                        <option value="ALL">Phase: All</option>
                        <option value="generation">Generation</option>
                        <option value="verification">Verification</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '2px' }}>
                      {mExec.map(m => (
                        <div
                          key={m.id}
                          className={`mcard sm ${getPriorityClass(m.priority)}`}
                          onClick={() => handleSelectMission(m)}
                          style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s', padding: '3px 4px' }}
                        >
                          <div className="mcard-top">
                            <div className="mcard-title-group" style={{ width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px', width: '100%' }}>
                                <b className="mcard-title-text" style={{ fontSize: '7.5px', lineHeight: 1.15 }}>{m.id.replace(/_/g, ' ')}</b>
                                <span style={{ fontSize: '5.5px', fontWeight: 800, padding: '0.5px 2px', borderRadius: '2px', background: 'rgba(245,158,11,0.12)', color: '#f59e0b', whiteSpace: 'nowrap' }}>
                                  ⚡ {m.priority || 'CRITICAL'}
                                </span>
                              </div>
                              <span className="mcard-slug mono" style={{ fontSize: '5.5px', opacity: 0.8 }}>{m.id}</span>
                            </div>
                          </div>
                          <p className="mcard-desc" style={{ fontSize: '6.5px', margin: '0.5px 0', lineHeight: 1.2 }}>{m.objective}</p>
                          
                          <div className="bar-row" style={{ margin: '1px 0' }}>
                            <div className="bar" style={{ height: '3px' }}>
                              <i style={{ width: m.metrics?.progress_percentage || '0%' }}></i>
                            </div>
                            <span className="bar-pct" style={{ fontSize: '5.5px' }}>{m.metrics?.progress_percentage || '0%'}</span>
                          </div>

                          {m.target_stack && (
                            <div style={{ fontSize: '5.5px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                              🛠️ {m.target_stack}
                            </div>
                          )}

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
                            <span className="mcard-meta-badge model-badge" style={{ fontSize: '5.5px', padding: '0.5px 2px' }}>🧬 {getCategoryLabel(m.type || m.category)}</span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                className="mini ghost"
                                style={{ fontSize: '6px', padding: '0.5px 3px' }}
                                onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'drafting'); }}
                              >◀ Draft</button>
                              <button
                                className="mini ghost"
                                style={{ fontSize: '6px', padding: '0.5px 3px' }}
                                onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'planning'); }}
                              >◀ Plan</button>
                              <button
                                className="mini accent-2"
                                style={{ fontSize: '6px', padding: '0.5px 3px', background: 'var(--accent-2)', color: '#fff', border: 'none' }}
                                onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'archive'); }}
                              >Deliver ✓</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {mExec.length === 0 && (
                        <div style={{
                          border: '1.5px dashed var(--border-soft)',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '8.5px',
                          color: 'var(--muted)',
                          fontFamily: 'var(--sans)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          background: 'rgba(255,255,255,0.015)'
                        }}>
                          <div style={{ fontSize: '16px', filter: 'grayscale(0.3) opacity(0.85)' }}>⚡</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '9px' }}>No Active Execution</div>
                          <p style={{ margin: 0, fontSize: '7.5px', color: 'var(--muted)', lineHeight: '1.2' }}>
                            Runtime components standing by.
                          </p>
                          <div style={{ marginTop: '2px' }}>
                            {mPlan.length > 0 ? (
                              <button
                                onClick={() => handleUpdateMissionStatus(mPlan[0], 'execution')}
                                style={{
                                  fontSize: '7.5px',
                                  fontWeight: 800,
                                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  boxShadow: '0 2px 6px rgba(245, 158, 11, 0.3)'
                                }}
                              >
                                <span>🚀 Launch ➔</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setIsAddMissionOpen(true)}
                                style={{
                                  fontSize: '7.5px',
                                  fontWeight: 800,
                                  background: 'var(--surface-alt)',
                                  color: 'var(--text-bright)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '3px',
                                  padding: '2px 6px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px'
                                }}
                              >
                                <span>+ Register</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Delivery Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minHeight: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border)', paddingBottom: '2px', height: '22px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--accent-2)', fontFamily: 'var(--sans)' }}>Delivery ({mArchive.length})</span>
                      <select
                        value={deliveryPhaseFilter}
                        onChange={(e) => setDeliveryPhaseFilter(e.target.value)}
                        style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text-secondary)', fontSize: '7px', padding: '0px 2px', outline: 'none', cursor: 'pointer' }}
                        title="Filter Delivery Phase"
                      >
                        <option value="ALL">Phase: All</option>
                        <option value="review_handover">Review & Handover</option>
                      </select>
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px', paddingRight: '2px' }}>
                      {mArchive.map(m => (
                        <div
                          key={m.id}
                          className="mcard sm"
                          onClick={() => handleSelectMission(m)}
                          style={{ display: 'flex', flexDirection: 'column', gap: '1.5px', opacity: 0.65, cursor: 'pointer', transition: 'transform 0.15s, border-color 0.15s', padding: '3px 4px' }}
                        >
                          <div className="mcard-top">
                            <div className="mcard-title-group" style={{ width: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '3px', width: '100%' }}>
                                <b className="mcard-title-text" style={{ textDecoration: 'line-through', fontSize: '7.5px', lineHeight: 1.15 }}>{m.id.replace(/_/g, ' ')}</b>
                                <span style={{ fontSize: '5.5px', fontWeight: 800, padding: '0.5px 2px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', color: 'var(--muted)', whiteSpace: 'nowrap' }}>
                                  ⚡ {m.priority || 'LOW'}
                                </span>
                              </div>
                              <span className="mcard-slug mono" style={{ fontSize: '5.5px', opacity: 0.8 }}>{m.id}</span>
                            </div>
                          </div>
                          <p className="mcard-desc" style={{ fontSize: '6.5px', margin: '0.5px 0', lineHeight: 1.2 }}>{m.objective}</p>
                          {m.target_stack && (
                            <div style={{ fontSize: '5.5px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                              🛠️ {m.target_stack}
                            </div>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1px' }}>
                            <span className="mcard-meta-badge model-badge" style={{ fontSize: '5.5px', padding: '0.5px 2px' }}>✓ archived</span>
                            <div style={{ display: 'flex', gap: '2px' }}>
                              <button
                                className="mini ghost"
                                style={{ fontSize: '6px', padding: '0.5px 3px' }}
                                onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'drafting'); }}
                              >◀ Draft</button>
                              <button
                                className="mini ghost"
                                style={{ fontSize: '6px', padding: '0.5px 3px' }}
                                onClick={(e) => { e.stopPropagation(); handleUpdateMissionStatus(m, 'execution'); }}
                              >Re-open ↺</button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {mArchive.length === 0 && (
                        <div style={{
                          border: '1.5px dashed var(--border-soft)',
                          padding: '8px 6px',
                          borderRadius: '6px',
                          textAlign: 'center',
                          fontSize: '8.5px',
                          color: 'var(--muted)',
                          fontFamily: 'var(--sans)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          background: 'rgba(255,255,255,0.015)'
                        }}>
                          <div style={{ fontSize: '16px', filter: 'grayscale(0.3) opacity(0.85)' }}>🎉</div>
                          <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '9px' }}>No Completed Items</div>
                          <p style={{ margin: 0, fontSize: '7.5px', color: 'var(--muted)', lineHeight: '1.2' }}>
                            Completed missions will appear here.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
            </div>
          </div>
        </section>
    </div>

        {/* ================= BOTTOM WORKSPACE AREA: LIVE APP PREVIEW ================= */}
        <div style={{
          flex: minCenter ? '1 1 100%' : (minBottomVertical ? '0 0 auto' : '1 1 50%'),
          minHeight: minBottomVertical ? '26px' : '180px',
          maxHeight: minBottomVertical ? '26px' : 'none',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderTop: '1px solid var(--border-soft)',
          transition: 'all 0.2s ease'
        }}>
          {/* Vertical Toggle Header ONLY when collapsed */}
          {minBottomVertical ? (
            <div
              onClick={() => toggleBottomVertical(false)}
              style={{
                background: 'var(--surface-alt)',
                padding: '0 10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-soft)',
                height: '26px',
                flexShrink: 0,
                cursor: 'pointer'
              }}
              title="Click to expand Preview & Code Editor section"
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', fontSize: '8.5px' }}>
                <span style={{ fontSize: '7.5px', fontWeight: 900, background: '#3b82f6', color: '#ffffff', padding: '1px 5px', borderRadius: '3px', textTransform: 'uppercase' }}>
                  PREVIEW & EDITOR
                </span>
                <span style={{ fontWeight: 800, color: '#10b981', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  🟢 LIVE PREVIEW ONLINE <span style={{ color: 'var(--muted)', fontWeight: 600 }}>(Port 3000)</span>
                </span>
                <span style={{ color: 'var(--border-soft)' }}>|</span>
                <span style={{ fontWeight: 800, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  📘 EDITOR: <span style={{ color: 'var(--text-bright)' }}>{activeCodePath || "src/server.ts"}</span>
                </span>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'row', minHeight: 0, overflow: 'hidden', height: '100%', position: 'relative' }}>
              {/* LEFT: LIVE APP PREVIEW */}
              {minPreviewState ? (
                <div 
                  onClick={() => setMinPreviewState(false)}
                  title="Click to re-expand Live Preview"
                  style={{
                    width: '32px',
                    minWidth: '32px',
                    height: '100%',
                    backgroundColor: 'var(--surface-alt)',
                    borderRight: '1px solid var(--border-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    padding: '8px 0',
                    gap: '8px',
                    flexShrink: 0
                  }}
                >
                  <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)' }}>▶</span>
                  <div style={{
                    writingMode: 'vertical-rl',
                    transform: 'rotate(180deg)',
                    fontSize: '9px',
                    fontWeight: 800,
                    color: 'var(--text-bright)',
                    letterSpacing: '1px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    <span>🟢 LIVE PREVIEW</span>
                  </div>
                </div>
              ) : (
                <div style={{ flex: minEditorState ? '1 1 100%' : '1 1 52%', minWidth: '280px', height: '100%', overflow: 'hidden' }}>
                  <LiveAppPreview
                    tenantId={user?.id || activeEntity || 'usr-123'}
                    containerState={isChatLoading ? 'waking_up' : 'warm'}
                    onMinimizeLeft={() => { setMinPreviewState(true); setMinEditorState(false); }}
                  />
                </div>
              )}

              {/* RIGHT: ALWAYS-OPEN CODE / FILE EDITOR */}
              {minEditorState ? (
                <div 
                  style={{
                    width: '32px',
                    minWidth: '32px',
                    height: '100%',
                    backgroundColor: 'var(--surface-alt)',
                    borderLeft: '1px solid var(--border-soft)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    padding: '8px 0',
                    gap: '8px',
                    flexShrink: 0
                  }}
                >
                  <div
                    onClick={() => setMinEditorState(false)}
                    title="Click to re-expand Code Editor"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      cursor: 'pointer',
                      flex: 1,
                      justifyContent: 'flex-start',
                      width: '100%'
                    }}
                  >
                    <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--accent)' }}>◀</span>
                    <div style={{
                      writingMode: 'vertical-rl',
                      transform: 'rotate(180deg)',
                      fontSize: '9px',
                      fontWeight: 800,
                      color: 'var(--text-bright)',
                      letterSpacing: '1px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      whiteSpace: 'nowrap'
                    }}>
                      <span>📘 CODE EDITOR</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBottomVertical(true);
                    }}
                    title="Minimize Preview & Editor sections as bottom bar"
                    style={{
                      height: '20px',
                      width: '20px',
                      fontSize: '9px',
                      fontWeight: 800,
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#38bdf8',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    ▼
                  </button>
                </div>
              ) : (
                <div style={{ flex: minPreviewState ? '1 1 100%' : '1 1 48%', minWidth: '260px', height: '100%', overflow: 'hidden' }}>
                  <InlineCodeEditor
                    activePath={activeCodePath || "src/server.ts"}
                    activeContent={activeCodeContent}
                    onSave={(path) => {
                      setToast({ message: `Saved ${path} to workspace!`, type: 'success', isOpen: true });
                    }}
                    onMinimize={() => toggleBottomVertical(true)}
                    onMinimizeRight={() => { setMinEditorState(true); setMinPreviewState(false); }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

        {/* ============ RIGHT COLUMN: WORKSPACE SUBSYSTEM (7 VERTICAL SUBSECTIONS) ============ */}
        <aside className="col side" style={{ width: minSide ? '36px' : '210px', minWidth: minSide ? '36px' : '170px', flexShrink: 0, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-soft)', transition: 'all 0.2s ease' }}>
          {minSide ? (
            <div 
              onClick={() => toggleProjectsHorizontal(false)}
              title="Click to expand Workspace Subsystem"
              style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '8px 0',
                background: 'var(--surface-alt)',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                fontSize: '7px',
                fontWeight: 900,
                color: '#38bdf8',
                background: 'rgba(56,189,248,0.1)',
                border: '1px solid rgba(56,189,248,0.25)',
                padding: '4px 2px',
                borderRadius: '3px',
                width: '28px'
              }} title="Total Items & 7 Sub-systems Active">
                <span>7</span>
                <span style={{ fontSize: '6px', color: 'var(--text-bright)' }}>SUBS</span>
              </div>

              <div style={{
                writingMode: 'vertical-rl',
                textTransform: 'uppercase',
                fontSize: '8px',
                fontWeight: 900,
                color: 'var(--text-bright)',
                letterSpacing: '1px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>📂 WORKSPACE SUBSYSTEM</span>
                <span style={{ color: '#10b981', fontSize: '7.5px' }}>(16 DOCS & DELIVERABLES)</span>
              </div>
            </div>
          ) : (
          <RightPanel
            tenantId={user?.id || activeEntity || 'usr-123'}
            containerState={isChatLoading ? 'waking_up' : 'warm'}
            bottomComponent={
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden', height: '100%', position: 'relative' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden',
                  background: 'var(--surface-alt)'
                }}>
                  {/* WORKSPACE SUBSYSTEM 7 SUB-SECTIONS (VERTICAL STACKED LIST WITH TOP SEARCH BAR) */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                      {/* TOP SEARCH BAR */}
                      <div style={{
                        padding: '4px 6px',
                        background: 'var(--surface-alt)',
                        borderBottom: '1px solid var(--border-soft)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0
                      }}>
                        {/* Minimize icon on the left of the workspace top-bar */}
                        <button
                          onClick={() => toggleProjectsHorizontal(true)}
                          title="Minimize Workspace section as right sidebar"
                          style={{
                            height: '18px',
                            width: '18px',
                            fontSize: '8px',
                            fontWeight: 800,
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: '#38bdf8',
                            borderRadius: '3px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          ▶
                        </button>

                        <div style={{ position: 'relative', flex: 1 }}>
                          <input
                            type="text"
                            placeholder="🔍 Search 7 sub-systems..."
                            value={workspaceSearchQuery}
                            onChange={(e) => setWorkspaceSearchQuery(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '2px 18px 2px 20px',
                              fontSize: '8px',
                              background: 'var(--surface)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '3px',
                              color: 'var(--text-bright)',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                          <span style={{ position: 'absolute', left: '5px', top: '50%', transform: 'translateY(-50%)', fontSize: '8px', color: 'var(--muted)' }}>
                            🔍
                          </span>
                          {workspaceSearchQuery && (
                            <button
                              onClick={() => setWorkspaceSearchQuery('')}
                              style={{
                                position: 'absolute',
                                right: '4px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--muted)',
                                fontSize: '8px',
                                cursor: 'pointer',
                                padding: '1px 3px'
                              }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

                      {/* 7 SUB-SECTIONS LIST */}
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflowY: 'auto', padding: '2px 3px', gap: '3px' }}>
                      {(() => {
                        const getDynamicFolderFiles = (sectionKey: string, fallbackFiles: any[]) => {
                          if (!workspaceMapData) return fallbackFiles;
                          const mappedKey = sectionKey === 'discovery_scoping' ? 'discovery_and_scoping' : sectionKey;
                          const items = workspaceMapData[mappedKey] || workspaceMapData[sectionKey];
                          if (Array.isArray(items) && items.length > 0) {
                            return items.map((f: any, idx: number) => ({
                              id: f.path || `ws-${sectionKey}-${idx}`,
                              name: f.name || (f.path ? f.path.split('/').pop() : 'file'),
                              path: f.path || f.name,
                              isDir: Boolean(f.isDirectory),
                              icon: f.isDirectory ? '📁' : f.name?.endsWith('.json') ? '🟨' : f.name?.endsWith('.md') ? '📄' : '📑',
                              content: f.content || `File: ${f.path}`
                            }));
                          }
                          return fallbackFiles;
                        };

                        const SECTION_WORKSPACE_FILES: Record<string, Array<{ id: string; name: string; path: string; isDir?: boolean; icon: string; content?: string }>> = {
                          discovery_scoping: getDynamicFolderFiles('discovery_scoping', [
                            { id: 'ws-disc-1', name: 'discovery_doc.json', path: 'discovery_doc.json', icon: '🟨', content: '{\n  "title": "Discovery & Scoping Requirements",\n  "target_audience": "Enterprise & Autonomous Developers",\n  "scope": "24/7 Autonomy Harness & Multi-Tenant Container Setup",\n  "status": "APPROVED",\n  "author": "AI Architect",\n  "created_at": "2026-08-06T08:00:00Z"\n}' },
                            { id: 'ws-disc-2', name: 'scoping.md', path: 'scoping.md', icon: '📄', content: '# Project Scoping & Objectives\n- **Goal**: Build scalable multi-tenant execution platform.\n- **Security**: Isolated Cloud Run containers with GCS FUSE mount.\n- **Autonomy**: Supervised agent loop with real-time feedback.' },
                            { id: 'ws-disc-3', name: 'metadata.json', path: 'metadata.json', icon: '🟨', content: '{\n  "name": "Fabrica",\n  "description": "24/7 AI Autonomy and Scale.",\n  "requestFramePermissions": [],\n  "majorCapabilities": [\n    "MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"\n  ]\n}' }
                          ]),
                          deep_research: getDynamicFolderFiles('deep_research', [
                            { id: 'ws-res-1', name: 'deep_research.md', path: 'deep_research.md', icon: '📡', content: '# Deep Research Findings & Technical Benchmarks\n- **Container Boot Latency**: <1.2s warm boot\n- **Storage Performance**: GCS FUSE mount throughput 120MB/s\n- **Model Latency**: Gemini 2.5 Flash sub-500ms response\n- **Concurrency**: Tested to 50 active tenant workers.' },
                            { id: 'ws-res-2', name: 'research_notes.txt', path: 'research_notes.txt', icon: '📑', content: '[Research Log]\nVerified memory footprint across 50 concurrent tenant workers.\nZero socket leaks detected.' }
                          ]),
                          data_analysis: getDynamicFolderFiles('data_analysis', [
                            { id: 'ws-data-1', name: 'data_analysis.csv', path: 'data_analysis.csv', icon: '📊', content: 'timestamp,tenant_id,cpu_usage,memory_mb,status\n2026-08-06T08:00:00Z,usr-123,12.4%,256,HEALTHY\n2026-08-06T08:05:00Z,usr-123,18.1%,312,HEALTHY\n2026-08-06T08:10:00Z,usr-123,14.2%,280,HEALTHY' },
                            { id: 'ws-data-2', name: 'metrics.json', path: 'metrics.json', icon: '🟨', content: '{\n  "total_turns": 142,\n  "avg_latency_ms": 480,\n  "cache_hit_ratio": 0.94,\n  "gcs_sync_status": "synced"\n}' }
                          ]),
                          strategic_synthesis: getDynamicFolderFiles('strategic_synthesis', [
                            { id: 'ws-synth-1', name: 'synthesis_report.md', path: 'synthesis_report.md', icon: '🎯', content: '# Strategic Architectural Synthesis\n1. Unified live app preview with embedded code editor.\n2. GCS persistent workspace file syncing.\n3. Responsive 7-subsystem workflow orchestration.' },
                            { id: 'ws-synth-2', name: 'workspace-graph.json', path: 'workspace-graph.json', icon: '🟨', content: '{\n  "version": "2.0.0",\n  "workspace_id": "ws-tenant-primary",\n  "tenant_id": "usr-123",\n  "storage_backend": "gcs_fuse_mount"\n}' }
                          ]),
                          executions: getDynamicFolderFiles('executions', [
                            { id: 'ws-exec-1', name: 'src/', path: 'src/', isDir: true, icon: '📁', content: '// Directory src/\n// Contains application server and harness files' },
                            { id: 'ws-exec-2', name: 'server.ts', path: 'src/server.ts', icon: '📘', content: `import express from 'express';\nimport { runAgentCliTurn } from './core/harness';\n\nconst app = express();\nconst PORT = process.env.PORT || 3000;\n\napp.get('/health', (req, res) => {\n  res.json({ status: 'ok', storage_type: 'GCS_DEDICATED_BUCKET' });\n});\n\napp.listen(PORT, () => console.log("Fabrica active"));` },
                            { id: 'ws-exec-3', name: 'App.tsx', path: 'App.tsx', icon: '📘', content: `'use client';\nimport React from 'react';\n\nexport default function App() {\n  return <div>⚡ Fabrica Live Application</div>;\n}` },
                            { id: 'ws-exec-4', name: 'package.json', path: 'package.json', icon: '🟨', content: '{\n  "name": "fabrica-tenant-app",\n  "version": "1.0.0"\n}' },
                            { id: 'ws-exec-5', name: 'runtime-board.json', path: 'runtime-board.json', icon: '🟨', content: '{\n  "runner_service": "fabrica-runner-usr-123",\n  "autonomy_level": "supervised"\n}' }
                          ]),
                          reviews: getDynamicFolderFiles('reviews', [
                            { id: 'ws-rev-1', name: 'audit_review.md', path: 'audit_review.md', icon: '🛡️', content: '# Security & Code Audit Review\n- [x] ESLint & TypeScript compilation clean\n- [x] Container sandbox isolation verified\n- [x] GCS auto-save syncing operational' }
                          ]),
                          completed: getDynamicFolderFiles('completed', [
                            { id: 'ws-comp-1', name: 'build_summary.log', path: 'build_summary.log', icon: '✅', content: '[BUILD SUCCESS] Turbopack production build finalized.\n[DEPLOY SUCCESS] App live at container port 3000.' }
                          ])
                        };

                        return [
                          { key: 'discovery_scoping', label: 'Discovery & Scoping', icon: '🔍', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', type: 'source' },
                          { key: 'deep_research', label: 'Deep Research', icon: '📡', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', type: 'source' },
                          { key: 'data_analysis', label: 'Data Analysis', icon: '📊', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', type: 'source' },
                          { key: 'strategic_synthesis', label: 'Strategic Synthesis', icon: '🎯', color: '#10b981', bg: 'rgba(16,185,129,0.1)', type: 'source' },
                          { key: 'executions', label: 'Executions', icon: '⚡', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', type: 'deliverable' },
                          { key: 'reviews', label: 'Reviews', icon: '🛡️', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', type: 'deliverable' },
                          { key: 'completed', label: 'Completed', icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.1)', type: 'deliverable' }
                        ].map(sec => {
                          const isSource = sec.type === 'source';
                          const sectionFiles = (SECTION_WORKSPACE_FILES[sec.key] || []).map(f => ({ ...f, isWorkspaceFile: true }));
                          const dbItems = isSource
                            ? rawDataList.filter((rd: any) => {
                                const proj = rd.metadata?.project_name || rd.metadata?.project || 'default_project';
                                if (selectedProjectName !== 'all' && proj !== selectedProjectName) return false;
                                const subSec = rd.metadata?.sub_section || rd.sub_section || 'discovery_scoping';
                                return subSec === sec.key;
                              })
                            : systemComponents.filter((sc: any) => {
                                const proj = sc.metadata?.project_name || sc.metadata?.project || 'default_project';
                                if (selectedProjectName !== 'all' && proj !== selectedProjectName) return false;
                                const subSec = sc.metadata?.sub_section || sc.sub_section || (sc.metadata?.status === 'processed' ? 'completed' : sc.metadata?.status === 'reviewing' ? 'reviews' : 'executions');
                                return subSec === sec.key;
                              });

                          let allItems = [...sectionFiles, ...dbItems];

                          if (workspaceSearchQuery.trim()) {
                            const q = workspaceSearchQuery.toLowerCase().trim();
                            allItems = allItems.filter((item: any) => {
                              const name = String(item.name || item.title || '').toLowerCase();
                              const desc = String(item.description || item.metadata?.description || item.content || '').toLowerCase();
                              const id = String(item.id || item.path || '').toLowerCase();
                              return name.includes(q) || desc.includes(q) || id.includes(q);
                            });
                          }

                          return (
                            <div key={sec.key} style={{
                              width: '100%',
                              flexShrink: 0,
                              background: 'var(--surface)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              padding: '3px 4px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '2px'
                            }}>
                              {/* SUB-SECTION HEADER */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '2px', borderBottom: '1px solid var(--border-soft)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', overflow: 'hidden' }}>
                                  <span style={{ fontSize: '9px', flexShrink: 0 }}>{sec.icon}</span>
                                  <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-bright)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {sec.label}
                                  </span>
                                  <span style={{
                                    fontSize: '6px',
                                    fontWeight: 800,
                                    color: sec.color,
                                    background: sec.bg,
                                    padding: '0.5px 3px',
                                    borderRadius: '2px',
                                    fontFamily: 'var(--mono)'
                                  }}>
                                    {allItems.length} {isSource ? 'Docs' : 'Items'}
                                  </span>
                                </div>

                                <div style={{ display: 'flex', gap: '2px' }}>
                                  <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    title={`Add new document to ${sec.label}`}
                                    style={{
                                      fontSize: '6.5px',
                                      fontWeight: 800,
                                      background: 'var(--surface-alt)',
                                      border: '1px solid var(--border-soft)',
                                      color: 'var(--text-bright)',
                                      borderRadius: '2px',
                                      padding: '0.5px 2.5px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    + Add
                                  </button>
                                  <button
                                    onClick={() => setIsExportModalOpen(true)}
                                    title={`Export item from ${sec.label}`}
                                    style={{
                                      fontSize: '6.5px',
                                      fontWeight: 800,
                                      background: 'var(--surface-alt)',
                                      border: '1px solid var(--border-soft)',
                                      color: 'var(--text-bright)',
                                      borderRadius: '2px',
                                      padding: '0.5px 2.5px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    📤 Export
                                  </button>
                                </div>
                              </div>

                              {/* SUB-SECTION ITEMS SCROLLABLE LIST */}
                              <div style={{ maxHeight: '180px', minHeight: '80px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                {allItems.length > 0 ? (
                                  allItems.map((item: any) => {
                                    const itemPath = item.path || item.name || item.title || '';
                                    const folderKey = item.isDir ? itemPath : (itemPath.includes('/') ? itemPath.split('/')[0] + '/' : '');
                                    
                                    // If this is a child file inside a folder, check if parent folder is collapsed
                                    if (!item.isDir && folderKey) {
                                      const isParentDirInList = allItems.some((dirItem: any) => dirItem.isDir && (dirItem.path === folderKey || dirItem.name === folderKey));
                                      if (isParentDirInList && expandedFolderPaths[folderKey] === false) {
                                        // Parent folder is collapsed, hide this child file
                                        return null;
                                      }
                                    }

                                    const isDirExpanded = item.isDir ? (expandedFolderPaths[itemPath] !== false) : false;
                                    const targetPath = item.isDir ? itemPath : (itemPath || 'src/server.ts');
                                    const isEditing = !item.isDir && (activeCodePath === targetPath || activeCodePath === item.name);
                                    
                                    // Helper function for realistic file/folder icons based on exact file types
                                    const getRealFileIcon = (nameOrPath: string, isDir?: boolean, isExpanded?: boolean): string => {
                                      if (isDir) {
                                        const dirLower = String(nameOrPath || '').toLowerCase();
                                        if (dirLower.includes('node_modules')) return '📦';
                                        if (dirLower.includes('git')) return '🌿';
                                        if (dirLower.includes('public')) return '🌐';
                                        if (dirLower.includes('component')) return '🧩';
                                        if (dirLower.includes('style') || dirLower.includes('css')) return '🎨';
                                        if (dirLower.includes('test') || dirLower.includes('qa')) return '🧪';
                                        if (dirLower.includes('data')) return '📊';
                                        if (dirLower.includes('doc')) return '📚';
                                        return isExpanded ? '📂' : '📁';
                                      }

                                      const cleanName = String(nameOrPath || '').split('/').pop() || nameOrPath || '';
                                      const lower = cleanName.toLowerCase();

                                      if (lower === 'package.json' || lower === 'package-lock.json' || lower === 'pnpm-lock.yaml' || lower === 'yarn.lock') return '📦';
                                      if (lower === 'tsconfig.json' || lower === 'jsconfig.json') return '⚙️';
                                      if (lower.includes('docker')) return '🐳';
                                      if (lower.startsWith('.env')) return '🔑';
                                      if (lower.includes('git') || lower === '.gitignore') return '🌿';
                                      if (lower === 'readme.md') return '📖';
                                      if (lower.includes('vite.config') || lower.includes('next.config') || lower.includes('webpack')) return '🛠️';
                                      if (lower.includes('audit') || lower.includes('security')) return '🛡️';

                                      if (lower.endsWith('.tsx') || lower.endsWith('.jsx')) return '⚛️';
                                      if (lower.endsWith('.ts')) return '📘';
                                      if (lower.endsWith('.js') || lower.endsWith('.mjs') || lower.endsWith('.cjs')) return '🟨';
                                      if (lower.endsWith('.json')) return '📑';
                                      if (lower.endsWith('.css') || lower.endsWith('.scss') || lower.endsWith('.less')) return '🎨';
                                      if (lower.endsWith('.html') || lower.endsWith('.htm')) return '🌐';
                                      if (lower.endsWith('.md') || lower.endsWith('.markdown')) return '📝';
                                      if (lower.endsWith('.csv')) return '📊';
                                      if (lower.endsWith('.log') || lower.endsWith('.txt')) return '📜';
                                      if (lower.endsWith('.py')) return '🐍';
                                      if (lower.endsWith('.sql') || lower.endsWith('.db') || lower.endsWith('.sqlite')) return '🗄️';
                                      if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.svg') || lower.endsWith('.webp') || lower.endsWith('.gif')) return '🖼️';
                                      if (lower.endsWith('.pdf')) return '📕';
                                      if (lower.endsWith('.zip') || lower.endsWith('.tar') || lower.endsWith('.gz')) return '🗜️';
                                      if (lower.endsWith('.sh') || lower.endsWith('.bash')) return '💻';

                                      return '📄';
                                    };

                                    const itemIcon = getRealFileIcon(item.name || item.path || item.title, item.isDir, isDirExpanded);
                                    const isChildFile = !item.isDir && folderKey && allItems.some((dirItem: any) => dirItem.isDir && (dirItem.path === folderKey || dirItem.name === folderKey));

                                    return (
                                      <div
                                        key={item.id || item.path || item.name}
                                        onClick={() => {
                                          if (item.isDir) {
                                            // A folder cannot be opened in code editor. Clicking toggles its contents!
                                            setExpandedFolderPaths(prev => {
                                              const current = prev[itemPath] !== false;
                                              const next = !current;
                                              setToast({ message: next ? `Expanded folder ${item.name || itemPath}` : `Collapsed folder ${item.name || itemPath}`, type: 'info', isOpen: true });
                                              return { ...prev, [itemPath]: next };
                                            });
                                          } else {
                                            // Open file in code editor
                                            const targetContent = item.content || item.description || (typeof item.metadata?.content === 'string' ? item.metadata.content : (item.metadata ? JSON.stringify(item.metadata, null, 2) : undefined));
                                            setActiveCodePath(targetPath);
                                            if (targetContent) setActiveCodeContent(targetContent);
                                            setToast({ message: `Opened ${targetPath} in Code Editor`, type: 'info', isOpen: true });
                                          }
                                        }}
                                        style={{
                                          background: isEditing ? 'rgba(56,189,248,0.12)' : 'var(--surface-alt)',
                                          border: isEditing ? '1px solid var(--accent)' : '1px solid var(--border-soft)',
                                          borderRadius: '2px',
                                          padding: '2.5px 4px',
                                          marginLeft: isChildFile ? '8px' : '0px',
                                          borderLeft: isChildFile ? '1.5px solid var(--accent)' : isEditing ? '1px solid var(--accent)' : '1px solid var(--border-soft)',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: '1px',
                                          fontSize: '7.5px',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <div style={{ fontWeight: isEditing ? 800 : 700, color: isEditing ? 'var(--accent)' : 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                            <span>{itemIcon}</span>
                                            <span>{item.name || item.title || 'Workspace Item'}</span>
                                          </div>
                                          {item.isDir ? (
                                            <span style={{ fontSize: '5.5px', color: 'var(--accent)', background: 'rgba(56,189,248,0.12)', padding: '0.5px 3px', borderRadius: '2px', fontWeight: 800 }}>
                                              {isDirExpanded ? '📂 DIR ▾' : '📁 DIR ▸'}
                                            </span>
                                          ) : isEditing ? (
                                            <span style={{ fontSize: '5.5px', fontWeight: 800, color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '0.5px 3px', borderRadius: '2px' }}>
                                              🟢 OPEN
                                            </span>
                                          ) : (
                                            <span style={{ fontSize: '5.5px', color: 'var(--muted)', background: 'var(--surface)', padding: '0.5px 2px', borderRadius: '2px' }}>
                                              FILE
                                            </span>
                                          )}
                                        </div>
                                        {(item.path || item.metadata?.description || item.description) && (
                                          <div style={{ fontSize: '6.5px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.path ? `workspace/${item.path}` : (item.metadata?.description || item.description)}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div style={{
                                    flex: 1,
                                    border: '1px dashed var(--border-soft)',
                                    borderRadius: '3px',
                                    padding: '6px 4px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '2px',
                                    textAlign: 'center',
                                    fontSize: '7px',
                                    color: 'var(--muted)',
                                    background: 'rgba(255,255,255,0.01)'
                                  }}>
                                    <span>No items in {sec.label}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                      </div>
                    </div>
                </div>
              </div>
            }
          />
          )}
        </aside>

          </div>
        </div>
      </main>

      {/* Realtime Event Payload Modal */}
      {selectedRealtimeEvent && (
        <div
          className="dashboard-modal-overlay"
          style={{
            background: 'rgba(9, 13, 22, 0.85)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px'
          }}
        >
          <div
            dir={uiLang === 'AR' ? 'rtl' : 'ltr'}
            style={{
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '450px',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '80vh',
            boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
            overflow: 'hidden'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              background: 'var(--surface-alt)',
              borderBottom: '1px solid var(--border-soft)'
            }}>
              <span style={{ fontWeight: 900, fontSize: '10px', textTransform: 'uppercase', fontFamily: 'var(--mono)', color: 'var(--text)' }}>
                🔍 Postgres Event Payload
              </span>
              <button 
                onClick={() => setSelectedRealtimeEvent(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '12px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', minHeight: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '9px', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block' }}>Table</span>
                  <span style={{ fontWeight: 'bold', fontFamily: 'var(--mono)', color: 'var(--text)' }}>{selectedRealtimeEvent.table}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block' }}>Event Type</span>
                  <span style={{ 
                    fontWeight: 'bold', 
                    fontFamily: 'var(--mono)',
                    color: selectedRealtimeEvent.eventType === 'INSERT' ? '#10b981' : selectedRealtimeEvent.eventType === 'DELETE' ? '#ef4444' : '#06b6d4'
                  }}>{selectedRealtimeEvent.eventType}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block' }}>Timestamp</span>
                  <span style={{ fontFamily: 'var(--mono)', color: 'var(--text)' }}>{selectedRealtimeEvent?.timestamp ? new Date(selectedRealtimeEvent.timestamp).toLocaleString() : 'N/A'}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block' }}>Event Log ID</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: '7.5px', color: 'rgba(255,255,255,0.3)' }}>{selectedRealtimeEvent.id}</span>
                </div>
              </div>

              {selectedRealtimeEvent.newPayload && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '8.5px', fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' }}>New Row State</span>
                  <pre style={{
                    background: '#040711',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    padding: '10px',
                    fontFamily: 'var(--mono)',
                    fontSize: '8px',
                    overflowX: 'auto',
                    color: '#38bdf8',
                    margin: 0
                  }}>
                    {JSON.stringify(selectedRealtimeEvent.newPayload, null, 2)}
                  </pre>
                </div>
              )}

              {selectedRealtimeEvent.oldPayload && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '8.5px', fontWeight: 900, color: 'var(--muted)', textTransform: 'uppercase' }}>Previous Row State (Old)</span>
                  <pre style={{
                    background: '#040711',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    padding: '10px',
                    fontFamily: 'var(--mono)',
                    fontSize: '8px',
                    overflowX: 'auto',
                    color: '#f43f5e',
                    margin: 0
                  }}>
                    {JSON.stringify(selectedRealtimeEvent.oldPayload, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div style={{ padding: '10px 16px', background: 'var(--surface-alt)', borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedRealtimeEvent(null)}
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '4px',
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                Close Payload Inspector
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ================= TOOLS EXPLORER WINDOW ================= */}
      {isToolsWindowOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            background: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            width: 'min(75rem, 95vw)',
            height: 'min(45rem, 85vh)',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '2px solid var(--border)',
              background: 'var(--surface-alt)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>{toolsWindowTab === 'skills' ? '🛠️' : '🔌'}</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <b style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {toolsWindowTab === 'skills' ? 'SKILLS EXPLORER' : 'INTEGRATIONS EXPLORER'}
                  </b>
                  <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>
                    {toolsWindowTab === 'skills' 
                      ? 'Registered kernel system capabilities & custom agent skills'
                      : 'Workspace integrations, API endpoints & external tools'}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsToolsWindowOpen(false)}
                className="fw-close-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  transition: 'all 0.15s'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {toolboxes ? (
                <SkillsAndExtensions
                  entityName={activeEntity}
                  toolboxes={toolboxes}
                  initialTab={toolsWindowTab}
                  onRefresh={fetchWorkspaceData}
                  showToast={(message, type) => setToast({ message, type, isOpen: true })}
                />
              ) : (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: '11px' }}>
                  Loading workspace capabilities...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

            {/* ================= WORKSPACE CONTEXT (AGENTS.MD) WINDOW ================= */}
      {isAgentsMdWindowOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            background: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            width: 'min(75rem, 95vw)',
            height: 'min(45rem, 85vh)',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '2px solid var(--border)',
              background: 'var(--surface-alt)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setIsAgentsMdWindowOpen(false)}
                  className="fw-close-btn"
                  title="Close window"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: '14px',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '26px',
                    height: '26px',
                    borderRadius: '4px',
                    transition: 'all 0.15s'
                  }}
                >
                  ✕
                </button>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.25rem' }}>📄</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <b style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>WORKSPACE CONTEXT (AGENTS.md)</b>
                    <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>
                      System directives, project guidelines & context active for the AI agent
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Body: AGENTS.md Editor */}
            <div style={{ flex: 1, padding: '16px', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', minHeight: 0 }}>
              {/* Controls Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                background: 'var(--surface-alt)',
                border: '1px solid var(--border-soft)',
                borderRadius: '6px',
                padding: '6px 10px',
                flexShrink: 0
              }}>
                {/* Stats & Path */}
                <span style={{ fontSize: '9px', fontFamily: 'var(--mono)', color: 'var(--muted)' }}>
                  {agentsMdContent ? agentsMdContent.split('\n').length : 0} lines · {(agentsMdContent?.length || 0).toLocaleString()} chars · path: <code style={{ color: 'var(--accent)' }}>{agentsMdPath || 'AGENTS.md'}</code>
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(agentsMdContent);
                      setToast({ message: 'Copied AGENTS.md to clipboard!', type: 'success', isOpen: true });
                    }}
                    title="Copy full AGENTS.md content to clipboard"
                    className="mini outline"
                    style={{ height: '26px', padding: '0 8px', fontSize: '9px', fontWeight: 800 }}
                  >
                    📋 Copy
                  </button>
                  <button
                    onClick={handleSaveAgentsMd}
                    disabled={isSavingAgentsMd}
                    className="mini accent"
                    style={{ height: '26px', padding: '0 12px', fontSize: '9px', fontWeight: 800 }}
                  >
                    {isSavingAgentsMd ? '⚙️ Saving...' : '💾 Save Changes'}
                  </button>
                </div>
              </div>

              {/* Presets / Quick Directives */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '9px', color: 'var(--muted)', fontWeight: 800 }}>⚡ Quick Directives:</span>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Custom Directive\n- Always validate typescript types before writing file.');
                    setToast({ message: 'Added Type Validation directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Type Validation
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Storage Directive\n- Store state in missions-graph.json and missions/<mission_id>.json and sync workspace artifacts.');
                    setToast({ message: 'Added Storage Directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Storage Protocol
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Security Directive\n- Enforce strict RLS policies and never leak secret keys.');
                    setToast({ message: 'Added Security Policy snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Security Policy
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## UI & Design Directive\n- Maintain clean light themes with generous spacing, high contrast, and responsive layout.');
                    setToast({ message: 'Added UI & Design directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + UI & Design
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Testing Directive\n- Automatically verify backend endpoints and component states prior to mission completion.');
                    setToast({ message: 'Added Testing directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Auto Testing
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Performance Directive\n- Optimize bundle sizes, memoize expensive renders, and minimize redundant API payloads.');
                    setToast({ message: 'Added Performance directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Performance
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Resilience Directive\n- Enforce robust try-catch guards with fallback UI indicators and zero unhandled rejections.');
                    setToast({ message: 'Added Error Resilience directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Error Resilience
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Clean Architecture Directive\n- Maintain modular code separation across components, hooks, core engines, and API routes.');
                    setToast({ message: 'Added Architecture directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Architecture
                </button>
                <button
                  onClick={() => {
                    setAgentsMdContent(prev => prev + '\n\n## Audit Directive\n- Log state transitions, mission progress, and telemetry events in runtime-board.json.');
                    setToast({ message: 'Added Audit Logging directive snippet!', type: 'info', isOpen: true });
                  }}
                  className="mini outline"
                  style={{ fontSize: '8px', padding: '2px 6px', height: '22px' }}
                >
                  + Audit Logging
                </button>
              </div>

              {/* Editor Container */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
                <textarea
                  value={agentsMdContent}
                  onChange={(e) => setAgentsMdContent(e.target.value)}
                  placeholder="# AGENTS.md - System Directives & Context..."
                  style={{
                    width: '100%',
                    height: '100%',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '6px',
                    padding: '12px',
                    color: 'var(--text-bright)',
                    fontFamily: 'var(--mono)',
                    fontSize: '11px',
                    lineHeight: '1.6',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

{/* ================= ACCOUNT & API ENGINE WINDOW ================= */}
      <AccountWorkspaceModal
        isOpen={isAccountWindowOpen}
        onClose={() => setIsAccountWindowOpen(false)}
        uiLang={uiLang}
        dtxt={dtxt}
        tokenBillingMode={tokenBillingMode}
        setTokenBillingMode={handleTokenBillingModeChange}
        piModelsList={piModelsList}
        geminiApiKey={geminiApiKey}
        openrouterApiKey={openrouterApiKey}
        anthropicApiKey={anthropicApiKey}
        geminiKeyStatus={geminiKeyStatus}
        openrouterKeyStatus={openrouterKeyStatus}
        anthropicKeyStatus={anthropicKeyStatus}
        handleGeminiKeyChange={handleGeminiKeyChange}
        handleSaveGeminiKey={handleSaveGeminiKey}
        handleClearGeminiKey={handleClearGeminiKey}
        handleOpenrouterKeyChange={handleOpenrouterKeyChange}
        handleSaveOpenRouterKey={handleSaveOpenRouterKey}
        handleClearOpenRouterKey={handleClearOpenRouterKey}
        handleAnthropicKeyChange={handleAnthropicKeyChange}
        handleSaveAnthropicKey={handleSaveAnthropicKey}
        handleClearAnthropicKey={handleClearAnthropicKey}
        chatModel={chatModel}
        handleModelChange={handleModelChange}
        isFetchingModels={isFetchingModels}
        fetchModelsError={fetchModelsError}
        fetchedModels={fetchedModels}
        loadRealModels={loadRealModels}
        renderModelOptions={renderModelOptions}
        showOnlyFree={showOnlyFree}
        setShowOnlyFree={setShowOnlyFree}
        autoFreeFallback={autoFreeFallback}
        setAutoFreeFallback={setAutoFreeFallback}
        modelMetadata={modelMetadata}
        user={user}
        onboardingUsername={onboardingUsername}
        onboardingCompanyName={onboardingCompanyName}
        activeEntity={activeEntity}
        userTierData={userTierData}
        SHOW_PAYMENT_UI={SHOW_PAYMENT_UI}
        selectedPlan={selectedPlan}
        setSelectedPlan={setSelectedPlan}
        handleSignOut={handleSignOut}
        setConfirmModal={setConfirmModal}
        getQuotaMetrics={getQuotaMetrics}
        renderQuotaWarningAlert={renderQuotaWarningAlert}
        handleTopUpCredits={handleTopUpCredits}
        isTierLoading={isTierLoading}
        fetchUserTierData={fetchUserTierData}
        freeModelsList={freeModelsList}
        fetchFreeModels={fetchFreeModels}
        keyPoolStats={keyPoolStats}
        fetchKeyPoolStats={fetchKeyPoolStats}
        poolNewProvider={poolNewProvider}
        setPoolNewProvider={setPoolNewProvider}
        poolNewKey={poolNewKey}
        setPoolNewKey={setPoolNewKey}
        handleAddKeyToPool={handleAddKeyToPool}
        cardNumber={cardNumber}
        setCardNumber={setCardNumber}
        cardExpiry={cardExpiry}
        setCardExpiry={setCardExpiry}
        cardCvc={cardCvc}
        setCardCvc={setCardCvc}
        cardBrand={cardBrand}
        setCardBrand={setCardBrand}
        isStripeLoading={isStripeLoading}
        setIsStripeLoading={setIsStripeLoading}
        userPaymentHistory={userPaymentHistory}
        setUserPaymentHistory={setUserPaymentHistory}
        isVerifyingCard={isVerifyingCard}
        setIsVerifyingCard={setIsVerifyingCard}
        setToast={setToast}
      />

      {/* ================= INTERACTIVE MOCKUP VIEWER MODAL ================= */}

      {/* ================= TELEMETRY & DATABASE REALTIME EVENT LOGS WINDOW ================= */}
      {isLogsWindowOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            background: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            width: 'min(68rem, 95vw)',
            height: 'min(44rem, 85vh)',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '2px solid var(--border)',
              background: 'var(--surface-alt)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>📋</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <b style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {dtxt.logsModalTitle}
                  </b>
                  <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>
                    {dtxt.logsModalDesc}
                  </span>
                </div>
              </div>

              {/* Clean Single Title Badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--surface)', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border-soft)' }}>
                <span style={{ fontSize: '10px' }}>📄</span>
                <span style={{ fontSize: '9px', fontWeight: 800, color: '#10b981', fontFamily: 'var(--mono)' }}>/mnt/logs.json</span>
              </div>

              <button
                onClick={() => setIsLogsWindowOpen(false)}
                className="fw-close-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px',
                  transition: 'all 0.15s'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, padding: '18px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              {/* ================= USER LOGS.JSON WORKFLOW ================= */}
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
                  {/* File Metadata & Top Toolbar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '8px 12px', background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '6px', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: 'var(--text-bright)', fontFamily: 'var(--mono)' }}>
                        📁 /mnt/logs.json
                      </span>
                      <span style={{ fontSize: '8px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px', background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}>
                        ACTIVE EVENT STREAM
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={fetchUserLogs}
                        disabled={isFetchingUserLogs}
                        style={{
                          padding: '3px 8px',
                          fontSize: '8.5px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          border: '1px solid var(--border-soft)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          cursor: 'pointer'
                        }}
                      >
                        {isFetchingUserLogs ? '⏳ Syncing...' : '🔄 Refresh Sync'}
                      </button>

                      <button
                        onClick={() => setUserLogsViewMode(userLogsViewMode === 'stream' ? 'json' : 'stream')}
                        style={{
                          padding: '3px 8px',
                          fontSize: '8.5px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          border: '1px solid var(--border-soft)',
                          background: userLogsViewMode === 'json' ? 'var(--text)' : 'var(--surface)',
                          color: userLogsViewMode === 'json' ? 'var(--surface)' : 'var(--text)',
                          cursor: 'pointer'
                        }}
                      >
                        {userLogsViewMode === 'stream' ? '🔍 Raw JSON' : '📜 Event Cards'}
                      </button>

                      <button
                        onClick={() => {
                          const blob = new Blob([JSON.stringify(userLogsData || {}, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `logs_${activeEntity || 'user'}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        style={{
                          padding: '3px 8px',
                          fontSize: '8.5px',
                          fontWeight: 700,
                          borderRadius: '4px',
                          border: '1px solid var(--border-soft)',
                          background: 'var(--surface)',
                          color: 'var(--text)',
                          cursor: 'pointer'
                        }}
                      >
                        📥 Export
                      </button>
                    </div>
                  </div>

                  {/* Filter bar */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'center', flexShrink: 0 }}>
                    <input
                      type="text"
                      placeholder="Search events, IDs, timestamps or details in logs.json..."
                      value={logSearchQuery}
                      onChange={(e) => setLogSearchQuery(e.target.value)}
                      style={{
                        flex: 1,
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        color: 'var(--text)',
                        fontSize: '9.5px',
                        padding: '5px 8px',
                        outline: 'none'
                      }}
                    />
                    {logSearchQuery && (
                      <button
                        onClick={() => setLogSearchQuery('')}
                        style={{
                          background: 'var(--surface-alt)',
                          border: '1px solid var(--border-soft)',
                          borderRadius: '4px',
                          color: 'var(--muted)',
                          fontSize: '8.5px',
                          padding: '4px 8px',
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Content View */}
                  {userLogsViewMode === 'json' ? (
                    <div style={{ flex: 1, background: '#0d1117', borderRadius: '6px', border: '1px solid var(--border-soft)', padding: '12px', overflowY: 'auto', fontFamily: 'var(--mono)', fontSize: '10px', color: '#e6edf3', minHeight: 0 }}>
                      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {JSON.stringify(userLogsData || { events: [], note: 'No logs initialized yet' }, null, 2)}
                      </pre>
                    </div>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', paddingRight: '4px', minHeight: 0 }}>
                      {(() => {
                        const events: any[] = userLogsData?.events || userLogsData?.logs || [];
                        const q = logSearchQuery.toLowerCase().trim();
                        const filtered = events.filter((evt: any) => {
                          if (!q) return true;
                          const str = JSON.stringify(evt).toLowerCase();
                          return str.includes(q);
                        });

                        if (filtered.length === 0) {
                          return (
                            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)', fontSize: '11px', background: 'var(--surface-alt)', borderRadius: '6px', border: '1px border-soft' }}>
                              {events.length === 0 ? 'No event records logged in logs.json yet.' : 'No events match your current search query.'}
                            </div>
                          );
                        }

                        return filtered.slice().reverse().map((evt: any, idx: number) => {
                          const type = String(evt.type || evt.category || 'system').toLowerCase();
                          let badgeBg = '#3b82f622';
                          let badgeColor = '#3b82f6';
                          if (type.includes('mission') || type.includes('execution')) { badgeBg = '#10b98122'; badgeColor = '#10b981'; }
                          else if (type.includes('source')) { badgeBg = '#8b5cf622'; badgeColor = '#8b5cf6'; }
                          else if (type.includes('deliverable') || type.includes('archive')) { badgeBg = '#f59e0b22'; badgeColor = '#f59e0b'; }

                          return (
                            <div key={evt.id || idx} style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '6px', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '7.5px', fontWeight: 800, padding: '1px 5px', borderRadius: '3px', background: badgeBg, color: badgeColor, textTransform: 'uppercase' }}>
                                    {evt.type || 'EVENT'}
                                  </span>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-bright)' }}>
                                    {evt.event || evt.title || evt.action || 'Workspace Event'}
                                  </span>
                                </div>
                                <span style={{ fontSize: '8px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                  {evt.timestamp ? new Date(evt.timestamp).toLocaleString() : 'N/A'}
                                </span>
                              </div>

                              {evt.details && (
                                <div style={{ fontSize: '9px', color: 'var(--text-secondary)', background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', fontFamily: 'var(--mono)', wordBreak: 'break-word' }}>
                                  {typeof evt.details === 'string' ? evt.details : JSON.stringify(evt.details)}
                                </div>
                              )}

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>ID: {evt.id || `evt-${idx}`}</span>
                                {evt.mission_id && (
                                  <span style={{ fontSize: '7.5px', color: 'var(--accent)', fontWeight: 700 }}>
                                    🎯 Mission: {evt.mission_id}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  )}
                </div>
              {false && (
                <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', height: '100%', minHeight: 0 }}>
                  
                  {/* Left Column: Configuration & Status */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    {/* Realtime Status Indicator */}
                    <div style={{ 
                      background: 'var(--surface-alt)', 
                      border: '1px solid var(--border-soft)', 
                      borderRadius: '8px', 
                      padding: '12px', 
                      fontSize: '9.5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text)' }}>CHANNEL STATUS:</span>
                        {supabase ? (
                          <span style={{ 
                            background: isRealtimeActive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(100, 116, 139, 0.1)', 
                            color: isRealtimeActive ? '#10b981' : '#64748b', 
                            padding: '2.5px 6px', 
                            borderRadius: '4px', 
                            fontSize: '8px', 
                            fontWeight: 900,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            border: isRealtimeActive ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(100, 116, 139, 0.2)',
                          }}>
                            <span style={{
                              width: '4px',
                              height: '4px',
                              borderRadius: '50%',
                              background: isRealtimeActive ? '#10b981' : '#64748b',
                              display: 'inline-block'
                            }}></span>
                            {isRealtimeActive ? 'ONLINE' : 'PAUSED'}
                          </span>
                        ) : (
                          <span style={{ 
                            background: 'rgba(239, 68, 68, 0.1)', 
                            color: '#ef4444', 
                            padding: '2.5px 6px', 
                            borderRadius: '4px', 
                            fontSize: '8px', 
                            fontWeight: 900,
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                          }}>
                            UNAVAILABLE
                          </span>
                        )}
                      </div>
                      
                      {!supabase ? (
                        <div style={{ color: 'var(--muted)', fontSize: '8.5px', lineHeight: '1.4' }}>
                          ⚠️ Supabase is not configured yet. Set <code style={{ color: 'var(--accent-2)' }}>NEXT_PUBLIC_SUPABASE_URL</code> and <code style={{ color: 'var(--accent-2)' }}>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in environment variables to enable Supabase Authentication.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <button
                            onClick={() => setIsRealtimeActive(!isRealtimeActive)}
                            style={{
                              width: '100%',
                              fontSize: '8.5px',
                              fontWeight: 800,
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-soft)',
                              background: isRealtimeActive ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent)',
                              color: isRealtimeActive ? '#f43f5e' : 'var(--accent-contrast)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              textTransform: 'uppercase'
                            }}
                          >
                            {isRealtimeActive ? '⏸ PAUSE LISTENING' : '▶ RESUME LISTENING'}
                          </button>
                          
                          <button
                            onClick={() => fetchWorkspaceData()}
                            style={{
                              width: '100%',
                              fontSize: '8.5px',
                              fontWeight: 800,
                              padding: '5px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-soft)',
                              background: 'var(--surface-alt)',
                              color: 'var(--text)',
                              cursor: 'pointer',
                              textAlign: 'center',
                              textTransform: 'uppercase'
                            }}
                            title="Force refresh current datasets"
                          >
                            🔄 FORCE SYNC
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Table Subscription Config */}
                    {supabase && (
                      <div style={{ 
                        background: 'var(--surface-alt)', 
                        border: '1px solid var(--border-soft)', 
                        borderRadius: '8px', 
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <span style={{ display: 'block', fontWeight: 'bold', fontSize: '9px', color: 'var(--muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Monitored Postgres Tables
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {Object.keys(realtimeSubscriptions).map((tableName) => (
                            <label 
                              key={tableName} 
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '6px', 
                                fontSize: '9px', 
                                color: realtimeSubscriptions[tableName] ? 'var(--text)' : 'var(--muted)',
                                cursor: 'pointer',
                                userSelect: 'none',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                background: realtimeSubscriptions[tableName] ? 'rgba(255,255,255,0.02)' : 'transparent',
                                border: '1px solid transparent',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={realtimeSubscriptions[tableName]}
                                onChange={() => setRealtimeSubscriptions(prev => ({
                                  ...prev,
                                  [tableName]: !prev[tableName]
                                }))}
                                disabled={!isRealtimeActive}
                                style={{ margin: 0, cursor: 'pointer', accentColor: 'var(--accent)' }}
                              />
                              <span style={{ fontFamily: 'var(--mono)' }}>{tableName}</span>
                            </label>
                          ))}
                        </div>

                        <div style={{ 
                          marginTop: '6px', 
                          paddingTop: '6px', 
                          borderTop: '1px solid var(--border-soft)', 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center' 
                        }}>
                          <span style={{ fontSize: '8.5px', color: '#10b981', fontWeight: 700 }}>
                            ● Auto-sync UI Active
                          </span>
                          
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              onClick={() => setRealtimeSubscriptions({
                                raw_data: true,
                                system_components: true,
                                missions: true,
                                tools: true,
                                app_config: true,
                                runtime_state: true
                              })}
                              disabled={!isRealtimeActive}
                              style={{ fontSize: '8px', background: 'transparent', border: 'none', color: 'var(--accent-2)', cursor: 'pointer', fontWeight: 800 }}
                            >
                              ALL
                            </button>
                            <span style={{ fontSize: '8px', color: 'var(--border-soft)' }}>|</span>
                            <button
                              onClick={() => setRealtimeSubscriptions({
                                raw_data: false,
                                system_components: false,
                                missions: false,
                                tools: false,
                                app_config: false,
                                runtime_state: false
                              })}
                              disabled={!isRealtimeActive}
                              style={{ fontSize: '8px', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontWeight: 800 }}
                            >
                              NONE
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Postgres Changes Transaction Log */}
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    minHeight: 0,
                    background: '#040711',
                    border: '1.5px solid var(--border)',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    {/* Changes Log Header */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      padding: '10px 12px', 
                      background: 'var(--surface-alt)', 
                      borderBottom: '1px solid var(--border-soft)',
                      flexShrink: 0
                    }}>
                      <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📡 Transaction Log Stream ({realtimeEvents.length})
                      </span>
                      
                      {/* Granular Filters Bar inside Right Header */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>Table:</span>
                          <select
                            value={realtimeTableFilter}
                            onChange={(e) => setRealtimeTableFilter(e.target.value)}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              color: 'var(--text)',
                              fontSize: '8.5px',
                              padding: '2px 4px',
                              outline: 'none',
                              fontFamily: 'var(--mono)'
                            }}
                          >
                            <option value="all">All Tables</option>
                            <option value="raw_data">raw_data</option>
                            <option value="system_components">system_components</option>
                            <option value="missions">missions</option>
                            <option value="tools">tools</option>
                            <option value="app_config">app_config</option>
                            <option value="runtime_state">runtime_state</option>
                          </select>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>Event:</span>
                          <select
                            value={realtimeEventFilter}
                            onChange={(e) => setRealtimeEventFilter(e.target.value)}
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border-soft)',
                              borderRadius: '4px',
                              color: 'var(--text)',
                              fontSize: '8.5px',
                              padding: '2px 4px',
                              outline: 'none',
                              fontFamily: 'var(--mono)'
                            }}
                          >
                            <option value="all">All Events</option>
                            <option value="INSERT">INSERT</option>
                            <option value="UPDATE">UPDATE</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>

                        {realtimeEvents.length > 0 && (
                          <>
                            <div style={{ width: '1px', height: '12px', background: 'var(--border-soft)' }}></div>
                            <button
                              onClick={() => setRealtimeEvents([])}
                              style={{ 
                                background: 'transparent', 
                                border: 'none', 
                                color: 'var(--status-error)', 
                                cursor: 'pointer', 
                                fontSize: '8.5px', 
                                fontWeight: 900,
                                textTransform: 'uppercase'
                              }}
                            >
                              🧹 CLEAR LOG
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Log Stream Container */}
                    <div style={{ 
                      flex: 1, 
                      overflowY: 'auto', 
                      padding: '10px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '6px',
                      fontFamily: 'var(--mono)',
                      fontSize: '9px'
                    }}>
                      {realtimeEvents
                        .filter(evt => {
                          if (realtimeTableFilter !== 'all' && evt.table !== realtimeTableFilter) return false;
                          if (realtimeEventFilter !== 'all' && evt.eventType !== realtimeEventFilter) return false;
                          return true;
                        })
                        .map((evt) => {
                          const isInsert = evt.eventType === 'INSERT';
                          const isDelete = evt.eventType === 'DELETE';
                          const badgeColor = isInsert ? '#10b981' : isDelete ? '#ef4444' : '#06b6d4';
                          const timeStr = new Date(evt.timestamp).toLocaleTimeString();

                          return (
                            <div 
                              key={evt.id} 
                              style={{ 
                                borderBottom: '1px solid rgba(255,255,255,0.03)', 
                                paddingBottom: '6px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '3px',
                                lineHeight: 1.4
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ 
                                    background: isInsert ? 'rgba(16,185,129,0.1)' : isDelete ? 'rgba(239,68,68,0.1)' : 'rgba(6,182,212,0.1)', 
                                    color: badgeColor, 
                                    fontSize: '7.5px', 
                                    fontWeight: 900, 
                                    padding: '2px 5px', 
                                    borderRadius: '3px',
                                    textTransform: 'uppercase',
                                    border: `1px solid ${isInsert ? 'rgba(16,185,129,0.2)' : isDelete ? 'rgba(239,68,68,0.2)' : 'rgba(6,182,212,0.2)'}`
                                  }}>
                                    {evt.eventType}
                                  </span>
                                  <span style={{ color: 'var(--text)', fontWeight: 'bold' }}>{evt.table}</span>
                                </div>
                                <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: '8px' }}>{timeStr}</span>
                              </div>

                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--muted)', paddingLeft: '4px' }}>
                                <span>Record ID: {evt.newPayload?.id || evt.oldPayload?.id || 'unknown'}</span>
                                <button
                                  onClick={() => setSelectedRealtimeEvent(evt)}
                                  style={{ 
                                    background: 'rgba(255,255,255,0.04)', 
                                    border: '1px solid var(--border-soft)', 
                                    borderRadius: '3px', 
                                    padding: '2px 6px', 
                                    fontSize: '8px', 
                                    color: 'var(--text)', 
                                    cursor: 'pointer',
                                    fontWeight: 800,
                                    transition: 'all 0.15s ease'
                                  }}
                                  className="hover:bg-[rgba(255,255,255,0.08)]"
                                >
                                  👀 VIEW PAYLOAD
                                </button>
                              </div>
                            </div>
                          );
                        })}

                      {realtimeEvents.filter(evt => {
                        if (realtimeTableFilter !== 'all' && evt.table !== realtimeTableFilter) return false;
                        if (realtimeEventFilter !== 'all' && evt.eventType !== realtimeEventFilter) return false;
                        return true;
                      }).length === 0 && (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          height: '100%', 
                          color: 'var(--muted)',
                          textAlign: 'center',
                          padding: '24px',
                          gap: '6px'
                        }}>
                          <span style={{ fontSize: '20px' }}>📡</span>
                          <span style={{ fontSize: '10.5px', fontWeight: 700 }}>No transaction logs found</span>
                          <span style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.3)', maxWidth: '280px', lineHeight: 1.4 }}>
                            {realtimeEvents.length === 0 
                              ? 'Awaiting active changes. Perform write operations on the database to view real-time events.'
                              : 'No logs match the selected table or event type filters.'
                            }
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM FOOTER / BOTTOMBAR ================= */}
      <footer className="bottombar" dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
        display: 'flex',
        alignItems: 'center',
        padding: '0px',
        gap: '0px',
        overflow: 'visible',
        zIndex: 1000,
        position: 'relative',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border-soft)'
      }}>
        {/* Left Controls: Project Context, Skills & Extensions, Autonomy Switcher (340px width aligned with Left Agent Column) */}
        <div className="bottombar-left-actions" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          width: '340px',
          minWidth: '340px',
          maxWidth: '340px',
          height: '38px',
          padding: '0px 10px',
          boxSizing: 'border-box',
          flexShrink: 0,
          borderRight: '1px solid var(--border-soft)'
        }}>
          {/* Project Context (Workspace Context - AGENTS.md) Button */}
          <button
            onClick={() => {
              fetchAgentsMd();
              setIsAgentsMdWindowOpen(true);
            }}
            className="mini accent"
            style={{
              padding: '1px 7px 1px 5px',
              fontSize: '7px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'linear-gradient(135deg, #0284c7, #0369a1)',
              border: '1px solid #cd7b4b',
              color: '#fff',
              height: '16px',
              flexShrink: 0,
              cursor: 'pointer',
              borderRadius: '9px',
              transition: 'all 0.15s'
            }}
            title="Click to open Workspace Context (AGENTS.md) directives window"
          >
            <span>📄 Context</span>
          </button>

          {/* Skills Button */}
          <button
            onClick={() => {
              setToolsWindowTab('skills');
              setIsToolsWindowOpen(true);
            }}
            className="mini accent"
            style={{
              padding: '1px 5px',
              fontSize: '7px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              border: 'none',
              color: '#fff',
              height: '16px',
              flexShrink: 0,
              cursor: 'pointer',
              borderRadius: '3px',
              transition: 'all 0.15s'
            }}
            title="Click to open Skills explorer."
          >
            <span>🛠️ Skills</span>
          </button>

          {/* Integrations Button */}
          <button
            onClick={() => {
              setToolsWindowTab('extensions');
              setIsToolsWindowOpen(true);
            }}
            className="mini accent"
            style={{
              padding: '1px 5px',
              fontSize: '7px',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '2px',
              background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
              border: 'none',
              color: '#fff',
              height: '16px',
              flexShrink: 0,
              cursor: 'pointer',
              borderRadius: '3px',
              transition: 'all 0.15s'
            }}
            title="Click to open Integrations explorer."
          >
            <span>🔌 Integrations</span>
          </button>

          {/* Autonomy Switcher — compact size button */}
          <div
            style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}
            onMouseEnter={(e) => handleAutonomyMouseEnter(e.currentTarget.getBoundingClientRect())}
            onMouseLeave={handleAutonomyMouseLeave}
          >
            <button
              onClick={() => {
                const nextState = !isAutonomyOn;
                setIsAutonomyOn(nextState);
                harnessApi.updateHarnessState({ autonomy: nextState ? autonomyLevel : 'off' }).catch(() => {});
                setToast({
                  message: `Autonomy turned ${nextState ? 'ON' : 'OFF'} (${nextState ? (autonomyLevel === 'autonomous' ? 'DIRECTOR' : 'WORKER') : 'SUPERVISED'})!`,
                  type: 'info',
                  isOpen: true
                });
              }}
              title="Click to toggle Autonomy ON/OFF. Hover to select mode."
              style={{
                height: '20px',
                padding: '0 6px',
                fontSize: '8px',
                fontWeight: 900,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                background: !isAutonomyOn
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                  : autonomyLevel === 'autonomous'
                  ? 'linear-gradient(135deg, #10b981, #059669)'
                  : 'linear-gradient(135deg, #f59e0b, #d97706)',
                border: 'none',
                borderRadius: '3px',
                color: '#fff',
                cursor: 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span style={{ fontSize: '9px' }}>🤖</span>
                <span style={{
                  fontSize: '7.5px',
                  padding: '1px 3px',
                  borderRadius: '2px',
                  background: 'rgba(0,0,0,0.25)',
                  fontWeight: 900
                }}>
                  {autonomyLevel === 'off' || !isAutonomyOn ? 'SUPERVISED' : autonomyLevel === 'director' ? 'DIRECTOR' : 'WORKER'}
                </span>
              </div>
            </button>

            {/* Hover Popover Dropdown for Autonomy Modes */}
            {isAutonomyHoverOpen && (
              <div
                onMouseEnter={() => handleAutonomyMouseEnter()}
                onMouseLeave={handleAutonomyMouseLeave}
                style={{
                  position: 'fixed',
                  bottom: `${autonomyPos ? autonomyPos.bottom : 26}px`,
                  left: `${autonomyPos ? autonomyPos.left : 20}px`,
                  width: '210px',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border-soft)',
                  borderRadius: '8px',
                  boxShadow: '0 16px 40px rgba(0,0,0,0.75)',
                  padding: '8px',
                  zIndex: 999999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', paddingBottom: '4px' }}>
                  <div style={{ fontSize: '8.5px', fontWeight: 900, color: 'var(--text)', textTransform: 'uppercase' }}>🤖 Autonomy System</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const nextState = !isAutonomyOn;
                      setIsAutonomyOn(nextState);
                      setToast({
                        message: `Autonomy turned ${nextState ? 'ON' : 'OFF'} (${nextState ? (autonomyLevel === 'autonomous' ? 'DIRECTOR' : 'WORKER') : 'SUPERVISED'})!`,
                        type: 'info',
                        isOpen: true
                      });
                    }}
                    style={{
                      padding: '2px 6px', fontSize: '8px', fontWeight: 900, borderRadius: '8px',
                      border: 'none', background: isAutonomyOn ? '#10b981' : '#ef4444',
                      color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px'
                    }}
                  >
                    <span>{isAutonomyOn ? '🟢 ON' : '🔴 OFF'}</span>
                  </button>
                </div>

                <button
                  onClick={() => handleAutonomyChange('director')}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '2px', padding: '5px 6px',
                    borderRadius: '4px',
                    border: isAutonomyOn && autonomyLevel === 'director' ? '1.5px solid #10b981' : '1px solid var(--border-soft)',
                    background: isAutonomyOn && autonomyLevel === 'director' ? 'rgba(16,185,129,0.12)' : 'var(--surface-alt)',
                    color: isAutonomyOn && autonomyLevel === 'director' ? '#10b981' : 'var(--text)',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8.5px', fontWeight: 800 }}>
                    <span>👑 DIRECTOR Mode</span>
                    {isAutonomyOn && autonomyLevel === 'director' && <span style={{ fontSize: '8px', fontWeight: 900 }}>✓ ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 600 }}>Agent wakes up via Heartbeat and executes actions</div>
                </button>

                <button
                  onClick={() => handleAutonomyChange('worker')}
                  style={{
                    display: 'flex', flexDirection: 'column', gap: '2px', padding: '5px 6px',
                    borderRadius: '4px',
                    border: isAutonomyOn && autonomyLevel === 'worker' ? '1.5px solid #f59e0b' : '1px solid var(--border-soft)',
                    background: isAutonomyOn && autonomyLevel === 'worker' ? 'rgba(245,158,11,0.12)' : 'var(--surface-alt)',
                    color: isAutonomyOn && autonomyLevel === 'worker' ? '#f59e0b' : 'var(--text)',
                    cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '8.5px', fontWeight: 800 }}>
                    <span>🛠️ WORKER Mode</span>
                    {isAutonomyOn && autonomyLevel === 'worker' && <span style={{ fontSize: '8px', fontWeight: 900 }}>✓ ACTIVE</span>}
                  </div>
                  <div style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 600 }}>AI performs planning with approval checkpoints</div>
                </button>
              </div>
            )}
          </div>

          {/* Heartbeat Interval Dropdown — visible in all modes, blurred when Autonomy is OFF */}
          {(() => {
            const isAutonomyDisabled = !isAutonomyOn || autonomyLevel === 'off';
            return (
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  flexShrink: 0,
                  filter: isAutonomyDisabled ? 'blur(1px)' : 'none',
                  opacity: isAutonomyDisabled ? 0.45 : 1,
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                <select
                  value={autonomyInterval}
                  disabled={isAutonomyDisabled}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setAutonomyInterval(val);
                    harnessApi.updateHarnessState({ autonomy_interval: val }).catch(() => {});
                    const labels: Record<number, string> = {
                      60: '1 min',
                      120: '2 min',
                      300: '5 min',
                      900: '15 min',
                      1800: '30 min',
                      3600: '1 h',
                      14400: '4 h',
                      86400: '1 D'
                    };
                    setToast({
                      message: `Heartbeat interval updated to ${labels[val] || val + 's'}`,
                      type: 'info',
                      isOpen: true
                    });
                  }}
                  title={isAutonomyDisabled ? 'Autonomy is OFF (Heartbeat Paused)' : 'Select Autonomy Heartbeat Interval'}
                  style={{
                    height: '16px',
                    padding: '0 2px',
                    fontSize: '7px',
                    fontWeight: 800,
                    background: 'var(--surface-alt)',
                    color: 'var(--text)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '3px',
                    cursor: isAutonomyDisabled ? 'not-allowed' : 'pointer',
                    outline: 'none',
                    flexShrink: 0
                  }}
                >
                  <option value={20}>⏱️ 20s</option>
                  <option value={60}>⏱️ 1 min</option>
                  <option value={120}>⏱️ 2 min</option>
                  <option value={300}>⏱️ 5 min</option>
                  <option value={900}>⏱️ 15 min</option>
                  <option value={1800}>⏱️ 30 min</option>
                  <option value={3600}>⏱️ 1 h</option>
                  <option value={14400}>⏱️ 4 h</option>
                  <option value={86400}>⏱️ 1 D</option>
                  {![20, 60, 120, 300, 900, 1800, 3600, 14400, 86400].includes(autonomyInterval) && (
                    <option value={autonomyInterval}>⏱️ {autonomyInterval}s</option>
                  )}
                </select>
              </div>
            );
          })()}
        </div>

        {/* Right Section: Backlogs & Reviews Operational Ticker Container */}
        <div className="bottombar-right-ticker" style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '4px 16px 4px 12px',
          height: '38px',
          boxSizing: 'border-box'
        }}>
          {/* Operations Ticker Banner */}
          <div className="bottombar-ticker" style={{
            flex: 1,
            display: 'flex',
            alignItems: 'stretch',
            height: '28px',
            overflow: 'hidden',
            fontSize: '9.5px',
            fontFamily: 'var(--mono)',
            boxSizing: 'border-box',
            userSelect: 'none',
            background: 'var(--surface-alt)',
            border: '1px solid var(--border-soft)',
            borderRadius: '4px',
            minWidth: 0,
            marginRight: uiLang === 'AR' ? 0 : '8px',
            marginLeft: uiLang === 'AR' ? '8px' : 0
          }}>
            {/* 1. Backlog segment */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(0, 0, 0, 0.08)',
              borderRight: '1px solid var(--border-soft)',
              minWidth: 0
            }}>
              {/* Interactive Count Badge Button for Backlog */}
              <button
                onClick={() => {
                  setEditedBacklog(normalizeBacklog(runtime?.backlog || []));
                  setIsBacklogEditorOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 10px',
                  background: 'var(--surface-alt)',
                  borderRight: uiLang === 'AR' ? 'none' : '1px solid var(--border-soft)',
                  borderLeft: uiLang === 'AR' ? '1px solid var(--border-soft)' : 'none',
                  borderTop: 'none',
                  borderBottom: 'none',
                  color: 'var(--accent)',
                  fontWeight: 800,
                  fontSize: '9px',
                  height: '100%',
                  position: 'relative',
                  zIndex: 3,
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                className="hover:bg-[rgba(255,255,255,0.03)]"
                title={dtxt.editBacklog || 'Edit Workspace Backlog'}
              >
                <span style={{ fontSize: '10px' }}>📋 BACKLOG</span>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent)',
                  padding: '1.5px 5px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 900,
                  fontFamily: 'var(--sans)',
                  marginLeft: '2px'
                }}>{runtime?.backlog?.length || 0}</span>
                <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '2px' }}>✏️</span>
              </button>

              {/* Backlog Ticker marquee */}
              <div className="review-marquee" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                paddingLeft: uiLang === 'AR' ? 0 : '10px',
                paddingRight: uiLang === 'AR' ? '10px' : 0,
                whiteSpace: 'nowrap',
                animation: runtime?.backlog && runtime.backlog.length > 0 ? 'marqueeLeftToRight 30s linear infinite' : 'none',
                width: 'max-content'
              }}>
                {runtime?.backlog && runtime.backlog.length > 0 ? (
                  [...runtime.backlog, ...runtime.backlog].map((item: any, idx: number) => {
                    const label = typeof item === 'string' ? item : (item.text || item.title || item.name || 'Objective');
                    const status = typeof item === 'object' ? item.status : 'pending';
                    const isDone = status === 'completed' || status === 'done';
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveBacklogItem(item);
                          setIsBacklogEditorOpen(true);
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(99, 102, 241, 0.08)',
                          border: `1px solid ${isDone ? 'rgba(16, 185, 129, 0.3)' : 'rgba(99, 102, 241, 0.25)'}`,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <span style={{
                          width: '4px',
                          height: '4px',
                          borderRadius: '50%',
                          background: isDone ? '#10b981' : 'var(--accent)',
                          display: 'inline-block'
                        }} />
                        <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '8.5px' }}>{label}</span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--muted)', fontSize: '8px', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', opacity: 0.8, paddingLeft: '4px', fontFamily: 'var(--sans)' }}>
                    <span>{dtxt.noBacklog || 'No active goals set'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Review Queue / Verifications segment */}
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden',
              background: 'rgba(0, 0, 0, 0.08)',
              minWidth: 0
            }}>
              {/* Interactive Count Badge Button */}
              <button
                onClick={() => {
                  setEditedReviewQueue(runtime?.review_queue || []);
                  setIsReviewEditorOpen(true);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0 10px',
                  background: 'var(--surface-alt)',
                  borderRight: uiLang === 'AR' ? 'none' : '1px solid var(--border-soft)',
                  borderLeft: uiLang === 'AR' ? '1px solid var(--border-soft)' : 'none',
                  borderTop: 'none',
                  borderBottom: 'none',
                  color: runtime?.review_queue && runtime.review_queue.length > 0 ? '#ef4444' : 'var(--muted)',
                  fontWeight: 800,
                  fontSize: '9px',
                  height: '100%',
                  position: 'relative',
                  zIndex: 3,
                  flexShrink: 0,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--sans)',
                  cursor: 'pointer',
                  outline: 'none',
                  transition: 'all 0.15s ease'
                }}
                className="hover:bg-[rgba(255,255,255,0.03)]"
                title={dtxt.editReviewQueue}
              >
                <span style={{ fontSize: '10px', color: runtime?.review_queue && runtime.review_queue.length > 0 ? '#ef4444' : 'var(--muted)' }}>🔍 QUEUE</span>
                <span style={{
                  background: runtime?.review_queue && runtime.review_queue.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  color: runtime?.review_queue && runtime.review_queue.length > 0 ? '#ef4444' : 'var(--muted)',
                  padding: '1.5px 5px',
                  borderRadius: '3px',
                  fontSize: '9px',
                  fontWeight: 900,
                  fontFamily: 'var(--sans)',
                  marginLeft: '2px'
                }}>{runtime?.review_queue?.length || 0}</span>
                <span style={{ fontSize: '9px', opacity: 0.6, marginLeft: '2px' }}>✏️</span>
              </button>

              {/* Ticker marquee */}
              <div className="review-marquee" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                paddingLeft: uiLang === 'AR' ? 0 : '10px',
                paddingRight: uiLang === 'AR' ? '10px' : 0,
                whiteSpace: 'nowrap',
                animation: runtime?.review_queue && runtime.review_queue.length > 0 ? 'marqueeLeftToRight 25s linear infinite' : 'none',
                width: 'max-content'
              }}>
                {runtime?.review_queue && runtime.review_queue.length > 0 ? (
                  [...runtime.review_queue, ...runtime.review_queue].map((item: any, idx: number) => {
                    const label = typeof item === 'string' ? item : (item.label || item.name || 'Verification');
                    const isResponded = item && typeof item === 'object' && item.status === 'responded';
                    const userResponse = item && typeof item === 'object' ? item.userResponse : '';

                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveReviewItem(item);
                          setReviewFeedbackText(userResponse || '');
                        }}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          background: isResponded ? 'rgba(16, 185, 129, 0.06)' : 'rgba(244, 63, 94, 0.08)',
                          border: `1px solid ${isResponded ? '#10b981' : '#f43f5e'}`,
                          padding: '2px 6px',
                          borderRadius: '3px',
                          transition: 'all 0.15s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.02)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <span style={{
                          width: '5px',
                          height: '5px',
                          borderRadius: '50%',
                          background: isResponded ? '#10b981' : '#f43f5e',
                          display: 'inline-block',
                          animation: isResponded ? 'none' : 'pulse 1.2s infinite'
                        }} />
                        <span style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '8.5px' }}>{label}</span>
                        {isResponded ? (
                          <span style={{ fontSize: '7px', color: '#10b981', background: 'rgba(16, 185, 129, 0.12)', padding: '0 3px', borderRadius: '2px' }}>
                            ✓ "{userResponse.slice(0, 8)}..."
                          </span>
                        ) : (
                          <span style={{ fontSize: '7px', color: '#f43f5e', background: 'rgba(244, 63, 94, 0.12)', padding: '0 3px', borderRadius: '2px', fontWeight: 900, animation: 'pulse 1.8s infinite' }}>
                            {dtxt.badgeNew}
                          </span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#10b981', fontSize: '8px', fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', opacity: 0.8, paddingLeft: '4px', fontFamily: 'var(--sans)' }}>
                    <span style={{ display: 'inline-block', width: '4px', height: '4px', borderRadius: '50%', background: '#10b981' }} />
                    <span>{dtxt.noApprovals || 'No approvals pending'}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </footer>

      {/* ================= ADD MISSION MODAL ================= */}
      {isAddMissionOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            background: 'rgba(9, 13, 22, 0.75)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 950,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            width: 'min(40rem, 95vw)',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.4), var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '2px solid var(--border)',
              background: 'var(--surface-alt)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.25rem' }}>🎯</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <b style={{ fontSize: '11px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{dtxt.addMissionTitle}</b>
                  <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>{dtxt.addMissionDesc} <span style={{ color: 'var(--accent-2)', fontWeight: 700 }}>_{activeEntity.toUpperCase()}</span></span>
                </div>
              </div>
              <button
                onClick={() => setIsAddMissionOpen(false)}
                className="fw-close-btn"
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '24px',
                  height: '24px',
                  borderRadius: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', maxHeight: '72vh' }}>
              
              {/* ================= MODAL TYPE SWITCHER ================= */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: '6px',
                padding: '4px',
                background: 'var(--surface-alt)',
                border: '1.5px solid var(--border)',
                borderRadius: '8px'
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setLauncherModelType('standard');
                    setNewMissionCategory('standard');
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: launcherModelType === 'standard' ? '1.5px solid #3b82f6' : '1px solid transparent',
                    background: launcherModelType === 'standard' ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    color: launcherModelType === 'standard' ? '#3b82f6' : 'var(--muted)',
                    fontWeight: 800,
                    fontSize: '9.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>🎯</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>Standard</span>
                    <span style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>Tasks & Goals</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLauncherModelType('full_pipeline');
                    setNewMissionCategory('system_build');
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: launcherModelType === 'full_pipeline' ? '1.5px solid #10b981' : '1px solid transparent',
                    background: launcherModelType === 'full_pipeline' ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                    color: launcherModelType === 'full_pipeline' ? '#10b981' : 'var(--muted)',
                    fontWeight: 800,
                    fontSize: '9.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>🚀</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>Full Pipeline</span>
                    <span style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>End-to-End Flow</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLauncherModelType('quick_pipeline');
                    setNewMissionCategory('system_build');
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: launcherModelType === 'quick_pipeline' ? '1.5px solid #f59e0b' : '1px solid transparent',
                    background: launcherModelType === 'quick_pipeline' ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                    color: launcherModelType === 'quick_pipeline' ? '#f59e0b' : 'var(--muted)',
                    fontWeight: 800,
                    fontSize: '9.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>⚡</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>Quick Jump</span>
                    <span style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>Direct Phase Jump</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLauncherModelType('custom_entry_pipeline');
                    setNewMissionCategory('system_build');
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: launcherModelType === 'custom_entry_pipeline' ? '1.5px solid #6366f1' : '1px solid transparent',
                    background: launcherModelType === 'custom_entry_pipeline' ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    color: launcherModelType === 'custom_entry_pipeline' ? '#6366f1' : 'var(--muted)',
                    fontWeight: 800,
                    fontSize: '9.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>🔄</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>Custom Entry</span>
                    <span style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>Start from Loop</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setLauncherModelType('custom_selection_pipeline');
                    setNewMissionCategory('system_build');
                  }}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: launcherModelType === 'custom_selection_pipeline' ? '1.5px solid #ec4899' : '1px solid transparent',
                    background: launcherModelType === 'custom_selection_pipeline' ? 'rgba(236, 72, 153, 0.15)' : 'transparent',
                    color: launcherModelType === 'custom_selection_pipeline' ? '#ec4899' : 'var(--muted)',
                    fontWeight: 800,
                    fontSize: '9.5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '11px' }}>🎛️</span>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', textAlign: 'left' }}>
                    <span>Custom Selection</span>
                    <span style={{ fontSize: '7px', fontWeight: 600, opacity: 0.8 }}>Multi-Select Loops</span>
                  </div>
                </button>
              </div>

              {/* Common Header Info: Mission ID & Priority */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)' }}>{dtxt.missionIdLabel}</span>
                  <input
                    type="text"
                    placeholder="e.g., swot_alignment"
                    value={newMissionId}
                    onChange={(e) => setNewMissionId(e.target.value)}
                    style={{
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '10px',
                      padding: '6px 8px',
                      outline: 'none',
                      fontFamily: 'var(--mono)'
                    }}
                  />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)' }}>{dtxt.priorityLabel}</span>
                  <select
                    value={newMissionPriority}
                    onChange={(e) => setNewMissionPriority(e.target.value as any)}
                    style={{
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '10px',
                      padding: '5.5px 8px',
                      outline: 'none',
                      fontWeight: 700
                    }}
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
              </div>

              {/* Objective Description Input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9px', fontWeight: 700, color: 'var(--muted)' }}>{dtxt.objectiveLabel}</span>
                  <button
                    type="button"
                    onClick={() => handleAiAutoGenerateInputs('objective_text')}
                    disabled={isAiGeneratingInputs}
                    style={{
                      background: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      color: '#8b5cf6',
                      fontSize: '8px',
                      fontWeight: 800,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    ✨ AI Auto-Suggest Objective
                  </button>
                </div>
                <textarea
                  placeholder={dtxt.objectivePlaceholder}
                  value={newMissionObjective}
                  onChange={(e) => setNewMissionObjective(e.target.value)}
                  style={{
                    height: '52px',
                    background: 'var(--surface-alt)',
                    border: '1px solid var(--border-soft)',
                    borderRadius: '4px',
                    color: 'var(--text)',
                    fontSize: '10px',
                    padding: '6px 8px',
                    resize: 'none',
                    outline: 'none',
                    lineHeight: 1.4
                  }}
                />
              </div>

              {/* ================= MODE 1: STANDARD / QUICK MISSION ================= */}
              {launcherModelType === 'standard' && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.04)',
                  border: '1.5px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase' }}>
                        🎯 Standard / Quick Mission Config
                      </span>
                      <span style={{ fontSize: '7.5px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                        PASSES: Drafting ➔ Planning ➔ Execution ➔ Delivery
                      </span>
                    </div>
                  </div>

                  <div style={{ fontSize: '8.5px', color: 'var(--muted)', lineHeight: 1.35 }}>
                    Supports custom user goal targets & autonomous multi-step agent execution tasks.
                  </div>

                  {/* Quick Presets row */}
                  <div>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                      ⚡ Quick Presets
                    </span>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '5px' }}>
                      {missionPresets.map(preset => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setNewMissionId(preset.id);
                            setNewMissionObjective(preset.objective);
                            setNewMissionPriority(preset.priority as any);
                          }}
                          style={{
                            padding: '5px 7px',
                            background: newMissionId === preset.id ? 'rgba(59, 130, 246, 0.15)' : 'var(--surface)',
                            border: newMissionId === preset.id ? '1.5px solid #3b82f6' : '1px solid var(--border-soft)',
                            borderRadius: '5px',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '8.5px',
                            color: 'var(--text)'
                          }}
                        >
                          <div style={{ fontWeight: 700, color: newMissionId === preset.id ? '#3b82f6' : 'var(--text)' }}>{preset.name}</div>
                          <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>{preset.objective}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Strategic Goals List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        🎯 Strategic Goals ({newStandardGoals.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAiAutoGenerateInputs('goals')}
                        style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', padding: '1px 6px', borderRadius: '3px', fontSize: '7.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ✨ Auto-Gen Goals
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '70px', overflowY: 'auto' }}>
                      {newStandardGoals.map((g, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border-soft)', fontSize: '8.5px' }}>
                          <span style={{ color: 'var(--text)', fontWeight: 600 }}>{g}</span>
                          <button
                            type="button"
                            onClick={() => setNewStandardGoals(newStandardGoals.filter((_, i) => i !== idx))}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '9px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <input
                        type="text"
                        value={newStandardGoalInput}
                        onChange={(e) => setNewStandardGoalInput(e.target.value)}
                        placeholder="Type strategic goal..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newStandardGoalInput.trim()) {
                            e.preventDefault();
                            setNewStandardGoals([...newStandardGoals, newStandardGoalInput.trim()]);
                            setNewStandardGoalInput('');
                          }
                        }}
                        style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '3px 6px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newStandardGoalInput.trim()) {
                            setNewStandardGoals([...newStandardGoals, newStandardGoalInput.trim()]);
                            setNewStandardGoalInput('');
                          }
                        }}
                        style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', borderRadius: '4px', padding: '0 8px', fontSize: '8.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ＋ Add Goal
                      </button>
                    </div>
                  </div>

                  {/* Execution Tasks List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        📋 Autonomous Agent Execution Tasks ({newStandardTasks.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAiAutoGenerateInputs('tasks')}
                        style={{ background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', padding: '1px 6px', borderRadius: '3px', fontSize: '7.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ✨ Auto-Gen Tasks
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', maxHeight: '70px', overflowY: 'auto' }}>
                      {newStandardTasks.map((t, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border-soft)', fontSize: '8.5px' }}>
                          <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{t}</span>
                          <button
                            type="button"
                            onClick={() => setNewStandardTasks(newStandardTasks.filter((_, i) => i !== idx))}
                            style={{ background: 'transparent', border: 'none', color: '#ef4444', fontSize: '9px', cursor: 'pointer' }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginTop: '2px' }}>
                      <input
                        type="text"
                        value={newStandardTaskInput}
                        onChange={(e) => setNewStandardTaskInput(e.target.value)}
                        placeholder="Type execution task..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newStandardTaskInput.trim()) {
                            e.preventDefault();
                            setNewStandardTasks([...newStandardTasks, newStandardTaskInput.trim()]);
                            setNewStandardTaskInput('');
                          }
                        }}
                        style={{ flex: 1, background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '3px 6px' }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newStandardTaskInput.trim()) {
                            setNewStandardTasks([...newStandardTasks, newStandardTaskInput.trim()]);
                            setNewStandardTaskInput('');
                          }
                        }}
                        style={{ background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6', borderRadius: '4px', padding: '0 8px', fontSize: '8.5px', fontWeight: 800, cursor: 'pointer' }}
                      >
                        ＋ Add Task
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ================= MODE 2: FULL PIPELINE MISSION ================= */}
              {launcherModelType === 'full_pipeline' && (
                <div style={{
                  background: 'rgba(16, 185, 129, 0.04)',
                  border: '1.5px solid rgba(16, 185, 129, 0.25)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#10b981', textTransform: 'uppercase' }}>
                        🚀 End-to-End Full Pipeline Architecture
                      </span>
                      <span style={{ fontSize: '7.5px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                        4 MAIN PHASES (DRAFTING ➔ PLANNING ➔ EXECUTION ➔ DELIVERING)
                      </span>
                    </div>
                  </div>

                  {/* Pipeline Overview Box */}
                  <div style={{ fontSize: '8.5px', color: 'var(--text-bright)', background: 'var(--surface-alt)', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-soft)', lineHeight: 1.4 }}>
                    Executes the full pipeline from <b>Idea to Production-Grade Deliverable</b>. Integrates specialized skills, automated verification feedback loops, and user approval gates.
                  </div>

                  {/* 4 PHASES BREAKDOWN & CONFIGURATION TREE */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    
                    {/* PHASE 1: DRAFTING */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: '#ec4899', background: 'rgba(236, 72, 153, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>PHASE 1</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text)' }}>Drafting Phase (Non-Loop Phase)</span>
                        </div>
                      </div>

                      {/* Sub-loop 1.1 */}
                      <div style={{ background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#ec4899' }}>🔄 1.1 Discovery & Scoping (Loop)</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>Gate:</span>
                              <input
                                type="checkbox"
                                checked={approvalGates['discovery_scoping'] !== false}
                                onChange={(e) => setApprovalGates({ ...approvalGates, discovery_scoping: e.target.checked })}
                              />
                            </label>
                            <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>Effort:</span>
                              <select
                                value={loopEfforts['discovery_scoping'] || 'Medium'}
                                onChange={(e) => setLoopEfforts({ ...loopEfforts, discovery_scoping: e.target.value as any })}
                                style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', fontSize: '7.5px', color: 'var(--text)' }}
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Deep">Deep</option>
                              </select>
                            </label>
                          </div>
                        </div>
                        <span style={{ fontSize: '7.5px', color: 'var(--muted)', lineHeight: 1.3 }}>
                          • Agent engages in interactive Q&A/brainstorming ➔ Debates strategy & trade-offs ➔ Stores parameters in <b>Sources/Discovery & Scoping</b>.
                        </span>
                      </div>
                    </div>

                    {/* PHASE 2: PLANNING */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: '#3b82f6', background: 'rgba(59, 130, 246, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>PHASE 2</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text)' }}>Planning Phase (🔄 Loop Phase)</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* 2.1 Deep Research */}
                        <div style={{ background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#ef4444' }}>🔄 2.1 Deep Research & Intelligence Gathering (Loop)</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span>Gate:</span>
                                <input
                                  type="checkbox"
                                  checked={approvalGates['deep_research'] !== false}
                                  onChange={(e) => setApprovalGates({ ...approvalGates, deep_research: e.target.checked })}
                                />
                              </label>
                              <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                <span>Effort:</span>
                                <select
                                  value={loopEfforts['deep_research'] || 'High'}
                                  onChange={(e) => setLoopEfforts({ ...loopEfforts, deep_research: e.target.value as any })}
                                  style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', fontSize: '7.5px', color: 'var(--text)' }}
                                >
                                  <option value="Low">Low</option>
                                  <option value="Medium">Medium</option>
                                  <option value="High">High</option>
                                  <option value="Deep">Deep</option>
                                </select>
                              </label>
                            </div>
                          </div>
                          <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                            Operates on <i>Sources/Discovery & Scoping</i> ➔ Web scrapers & ArXiv papers ➔ Outputs into <b>Sources/Deep Research & Intelligence Gathering</b>.
                          </span>
                        </div>

                        {/* 2.2 Data Analysis */}
                        <div style={{ background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#3b82f6' }}>📄 2.2 Data Analysis & Pattern Extraction (Non-Loop)</span>
                            <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>Gate:</span>
                              <input
                                type="checkbox"
                                checked={approvalGates['data_analysis'] === true}
                                onChange={(e) => setApprovalGates({ ...approvalGates, data_analysis: e.target.checked })}
                              />
                            </label>
                          </div>
                          <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                            Operates on <i>Discovery + Research</i> ➔ Computes key metrics & anomalies ➔ Outputs into <b>Sources/Data Analysis & Pattern Extraction</b>.
                          </span>
                        </div>

                        {/* 2.3 Strategic Synthesis */}
                        <div style={{ background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#8b5cf6' }}>📄 2.3 Strategic Synthesis & Decision Support (Non-Loop)</span>
                            <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>Gate:</span>
                              <input
                                type="checkbox"
                                checked={approvalGates['strategic_synthesis'] !== false}
                                onChange={(e) => setApprovalGates({ ...approvalGates, strategic_synthesis: e.target.checked })}
                              />
                            </label>
                          </div>
                          <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                            Synthesizes all sources into Actionable Strategic Plan & Decision Matrix ➔ <b>Sources/Strategic Synthesis & Decision Support</b>.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PHASE 3: EXECUTION */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>PHASE 3</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text)' }}>Execution Phase (🔄 Execution Loop Driver)</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        {/* 3.1 Generation */}
                        <div style={{ background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#f59e0b' }}>⚙️ 3.1 Generation (Non-Loop)</span>
                          <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                            Operates on <i>Strategic Synthesis</i> or Verification/Review feedback ➔ Generates Assets & Code ➔ Outputs into <b>Deliverables/Executions</b>.
                          </span>
                        </div>

                        {/* 3.2 Verification */}
                        <div style={{ background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#10b981' }}>🧪 3.2 Verification & Compliance Audit (Non-Loop)</span>
                            <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>Gate:</span>
                              <input
                                type="checkbox"
                                checked={approvalGates['verification'] !== false}
                                onChange={(e) => setApprovalGates({ ...approvalGates, verification: e.target.checked })}
                              />
                            </label>
                          </div>
                          <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                            Verifies Executions match Strategic Synthesis with zero gaps. <i>If NOT OK ➔ Re-loops to Generation. If OK ➔ Moves to <b>Deliverables/Reviews</b>.</i>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* PHASE 4: DELIVERING */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '6px', padding: '8px 10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '9px', fontWeight: 900, color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '1px 5px', borderRadius: '3px' }}>PHASE 4</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text)' }}>Delivering Phase (Non-Loop Phase)</span>
                        </div>
                      </div>

                      <div style={{ background: 'var(--surface-alt)', padding: '6px 8px', borderRadius: '4px', border: '1px solid var(--border-soft)', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '8.5px', fontWeight: 800, color: '#10b981' }}>📦 4.1 Production Deliverable Review</span>
                          <label style={{ fontSize: '7.5px', fontWeight: 700, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>Gate:</span>
                            <input
                              type="checkbox"
                              checked={approvalGates['review'] !== false}
                              onChange={(e) => setApprovalGates({ ...approvalGates, review: e.target.checked })}
                            />
                          </label>
                        </div>
                        <span style={{ fontSize: '7.5px', color: 'var(--muted)' }}>
                          Final production deliverable in <b>Deliverables/Reviews</b>. <i>If Accepted ➔ <b>Deliverables/Completed</b>. If Feedback ➔ Re-loops to Executions.</i>
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Tech Stack Specs & Target Paths */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Target File Paths</span>
                      <input
                        type="text"
                        value={pipelineSelectedPaths.join(', ')}
                        onChange={(e) => setPipelineSelectedPaths(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. /frontend-next/app/dashboard/page.tsx"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', fontFamily: 'var(--mono)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Architecture Stack Specs</span>
                      <input
                        type="text"
                        value={pipelineSelectedStack.join(', ')}
                        onChange={(e) => setPipelineSelectedStack(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. Next.js 16, TypeScript, Tailwind CSS"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= MODE 3: QUICK PIPELINE MISSION ================= */}
              {launcherModelType === 'quick_pipeline' && (
                <div style={{
                  background: 'rgba(245, 158, 11, 0.04)',
                  border: '1.5px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>⚡</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: '#f59e0b', textTransform: 'uppercase' }}>
                        Quick Pipeline Mission: Direct Phase Jump
                      </span>
                    </div>
                    <span style={{ fontSize: '8px', fontWeight: 700, padding: '2px 6px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderRadius: '4px' }}>
                      Single Phase Jump
                    </span>
                  </div>

                  <p style={{ fontSize: '9px', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>
                    Select any specific phase to jump directly into (e.g., jump straight to Stage 3 Execution). Prior stages will be bypassed.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)' }}>Target Phase Jump:</span>
                    <select
                      value={quickStartPhase}
                      onChange={(e) => setQuickStartPhase(e.target.value)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        borderRadius: '5px',
                        color: 'var(--text)',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '6px 8px'
                      }}
                    >
                      <option value="discovery_scoping">💡 Stage 1: Drafting (Discovery & Scoping)</option>
                      <option value="deep_research">🔍 Stage 2.1: Planning (Deep Research)</option>
                      <option value="data_analysis">📊 Stage 2.2: Planning (Data Analysis)</option>
                      <option value="strategic_synthesis">🧠 Stage 2.3: Planning (Strategic Synthesis)</option>
                      <option value="execution">⚙️ Stage 3.1: Execution (Generation & Coding)</option>
                      <option value="verification">🧪 Stage 3.2: Execution (Verification & Audit)</option>
                      <option value="review">📦 Stage 4: Delivering (Production Review Gate)</option>
                    </select>
                  </div>

                  <div style={{ padding: '8px 10px', background: 'rgba(245, 158, 11, 0.08)', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px' }}>📍</span>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#f59e0b' }}>
                      Execution Target: {quickStartPhase === 'execution' ? 'Stage 3.1 Generation & Coding' : quickStartPhase} (Immediate activation)
                    </span>
                  </div>

                  {/* Tech Stack Specs & Target Paths */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Target File Paths</span>
                      <input
                        type="text"
                        value={pipelineSelectedPaths.join(', ')}
                        onChange={(e) => setPipelineSelectedPaths(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. /frontend-next/app/dashboard/page.tsx"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', fontFamily: 'var(--mono)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Architecture Stack Specs</span>
                      <input
                        type="text"
                        value={pipelineSelectedStack.join(', ')}
                        onChange={(e) => setPipelineSelectedStack(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. Next.js 16, TypeScript, Tailwind CSS"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= MODE 4: CUSTOM ENTRY PIPELINE MISSION ================= */}
              {launcherModelType === 'custom_entry_pipeline' && (
                <div style={{
                  background: 'rgba(99, 102, 241, 0.04)',
                  border: '1.5px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>🔄</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: '#6366f1', textTransform: 'uppercase' }}>
                        Custom Entry Pipeline Mission: Start-to-End Flow
                      </span>
                    </div>
                    <span style={{ fontSize: '8px', fontWeight: 700, padding: '2px 6px', background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', borderRadius: '4px' }}>
                      Sequential Re-entry
                    </span>
                  </div>

                  <p style={{ fontSize: '9px', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>
                    Executes the entire start-to-end pipeline starting from the selected loop or phase, proceeding sequentially through all downstream stages to Delivery.
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--text)' }}>Starting Entry Phase:</span>
                    <select
                      value={customEntryPhase}
                      onChange={(e) => setCustomEntryPhase(e.target.value)}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid rgba(99, 102, 241, 0.4)',
                        borderRadius: '5px',
                        color: 'var(--text)',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        padding: '6px 8px'
                      }}
                    >
                      <option value="discovery_scoping">💡 Stage 1: Drafting (Discovery & Scoping)</option>
                      <option value="deep_research">🔍 Stage 2.1: Planning (Deep Research)</option>
                      <option value="data_analysis">📊 Stage 2.2: Planning (Data Analysis)</option>
                      <option value="strategic_synthesis">🧠 Stage 2.3: Planning (Strategic Synthesis)</option>
                      <option value="execution">⚙️ Stage 3.1: Execution (Generation & Coding)</option>
                      <option value="verification">🧪 Stage 3.2: Execution (Verification & Audit)</option>
                      <option value="review">📦 Stage 4: Delivering (Production Review Gate)</option>
                    </select>
                  </div>

                  <div style={{ padding: '8px 10px', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '6px', border: '1px solid rgba(99, 102, 241, 0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px' }}>➡️</span>
                    <span style={{ fontSize: '8.5px', fontWeight: 700, color: '#6366f1' }}>
                      Pipeline Flow: [{customEntryPhase}] ──► Downstream Stages ──► Delivery
                    </span>
                  </div>

                  {/* Tech Stack Specs & Target Paths */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Target File Paths</span>
                      <input
                        type="text"
                        value={pipelineSelectedPaths.join(', ')}
                        onChange={(e) => setPipelineSelectedPaths(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. /frontend-next/app/dashboard/page.tsx"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', fontFamily: 'var(--mono)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Architecture Stack Specs</span>
                      <input
                        type="text"
                        value={pipelineSelectedStack.join(', ')}
                        onChange={(e) => setPipelineSelectedStack(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. Next.js 16, TypeScript, Tailwind CSS"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= MODE 5: CUSTOM SELECTION PIPELINE MISSION ================= */}
              {launcherModelType === 'custom_selection_pipeline' && (
                <div style={{
                  background: 'rgba(236, 72, 153, 0.04)',
                  border: '1.5px solid rgba(236, 72, 153, 0.3)',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>🎛️</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, color: '#ec4899', textTransform: 'uppercase' }}>
                        Custom Selection Pipeline: Multi-Selected Loops
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedPipelinePhases({
                          discovery_scoping: true, deep_research: true, data_analysis: true, strategic_synthesis: true, generation: true, verification: true, review: true
                        })}
                        style={{ padding: '2px 5px', fontSize: '7.5px', fontWeight: 800, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPipelinePhases({
                          discovery_scoping: false, deep_research: false, data_analysis: false, strategic_synthesis: false, generation: true, verification: true, review: true
                        })}
                        style={{ padding: '2px 5px', fontSize: '7.5px', fontWeight: 800, background: 'rgba(236, 72, 153, 0.15)', color: '#ec4899', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        Exec & Deliv Only
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPipelinePhases({
                          discovery_scoping: false, deep_research: false, data_analysis: false, strategic_synthesis: false, generation: false, verification: false, review: false
                        })}
                        style={{ padding: '2px 5px', fontSize: '7.5px', fontWeight: 800, background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border-soft)', borderRadius: '3px', cursor: 'pointer' }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '9px', color: 'var(--muted)', margin: 0, lineHeight: '1.4' }}>
                    Executes the pipeline with ONLY selected loops and phases, ignoring and skipping non-selected ones.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    {[
                      { key: 'discovery_scoping', label: '💡 Stage 1: Drafting (Discovery)' },
                      { key: 'deep_research', label: '🔍 Stage 2.1: Planning (Deep Research)' },
                      { key: 'data_analysis', label: '📊 Stage 2.2: Planning (Data Analysis)' },
                      { key: 'strategic_synthesis', label: '🧠 Stage 2.3: Planning (Strategic Synthesis)' },
                      { key: 'generation', label: '⚙️ Stage 3.1: Execution (Generation)' },
                      { key: 'verification', label: '🧪 Stage 3.2: Execution (Verification)' },
                      { key: 'review', label: '📦 Stage 4: Delivering (Review Gate)' }
                    ].map(ph => {
                      const isChecked = !!selectedPipelinePhases[ph.key];
                      return (
                        <button
                          key={ph.key}
                          type="button"
                          onClick={() => setSelectedPipelinePhases({ ...selectedPipelinePhases, [ph.key]: !isChecked })}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '5px',
                            border: isChecked ? '1.5px solid #ec4899' : '1px solid var(--border-soft)',
                            background: isChecked ? 'rgba(236, 72, 153, 0.12)' : 'var(--surface)',
                            color: isChecked ? '#ec4899' : 'var(--muted)',
                            fontSize: '8.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            textAlign: 'left'
                          }}
                        >
                          <span>{ph.label}</span>
                          <span style={{ fontSize: '9px', fontWeight: 900 }}>{isChecked ? '✓' : '—'}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ padding: '6px 8px', background: 'rgba(236, 72, 153, 0.08)', borderRadius: '5px', border: '1px solid rgba(236, 72, 153, 0.2)', fontSize: '8.5px', fontWeight: 700, color: '#ec4899' }}>
                    🎛️ {Object.values(selectedPipelinePhases).filter(Boolean).length} of 7 phases enabled. Non-selected phases will be skipped automatically.
                  </div>

                  {/* Tech Stack Specs & Target Paths */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Target File Paths</span>
                      <input
                        type="text"
                        value={pipelineSelectedPaths.join(', ')}
                        onChange={(e) => setPipelineSelectedPaths(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. /frontend-next/app/dashboard/page.tsx"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px', fontFamily: 'var(--mono)' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)' }}>Architecture Stack Specs</span>
                      <input
                        type="text"
                        value={pipelineSelectedStack.join(', ')}
                        onChange={(e) => setPipelineSelectedStack(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                        placeholder="e.g. Next.js 16, TypeScript, Tailwind CSS"
                        style={{ background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '4px', color: 'var(--text)', fontSize: '8.5px', padding: '4px 6px' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ================= EXTRA SOURCES / PRIOR OUTPUTS BINDING ================= */}
              <div style={{
                background: 'rgba(139, 92, 246, 0.05)',
                border: '1.5px solid rgba(139, 92, 246, 0.25)',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '9px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase' }}>
                    🔗 Linked Context / Sources ({selectedExtraSources.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAiAutoGenerateInputs('extra_sources')}
                    style={{ background: 'rgba(139, 92, 246, 0.15)', border: '1px solid rgba(139, 92, 246, 0.35)', color: '#8b5cf6', padding: '2px 7px', borderRadius: '4px', fontSize: '8px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    ✨ Suggest Linked Sources
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', maxHeight: '90px', overflowY: 'auto' }}>
                  {getAvailableExtraSources().map(src => {
                    const isSelected = selectedExtraSources.includes(src.id);
                    return (
                      <button
                        type="button"
                        key={src.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedExtraSources(selectedExtraSources.filter(id => id !== src.id));
                          } else {
                            setSelectedExtraSources([...selectedExtraSources, src.id]);
                          }
                        }}
                        style={{
                          background: isSelected ? 'rgba(139, 92, 246, 0.22)' : 'var(--surface)',
                          border: isSelected ? '1.5px solid #8b5cf6' : '1px solid var(--border-soft)',
                          borderRadius: '5px',
                          padding: '3px 7px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <span style={{ fontSize: '8px', fontWeight: 800, color: isSelected ? '#8b5cf6' : 'var(--text)' }}>
                          {src.title}
                        </span>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: isSelected ? '#8b5cf6' : 'var(--muted)' }}>
                          {isSelected ? '✓' : '＋'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              padding: '12px 18px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setIsAddMissionOpen(false)}
                className="mini ghost"
                style={{ padding: '6px 12px', fontSize: '10px' }}
              >
                {dtxt.cancelBtn}
              </button>
              <button
                onClick={handleCreateMission}
                className="mini accent"
                style={{
                  padding: '6px 16px',
                  fontSize: '10px',
                  fontWeight: 800,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer'
                }}
                disabled={isAddingMission}
              >
                {isAddingMission ? dtxt.creatingBtn : dtxt.createMissionBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PIPELINE CONFIGURATION MODAL (MERGED GATES & EFFORTS) ================= */}
      {(isGatesModalOpen || isEffortModalOpen) && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '580px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🎛️</span>
                <div>
                  <b style={{ fontSize: '12px', color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Pipeline Configuration
                  </b>
                  <span style={{ fontSize: '8.5px', color: 'var(--muted)', display: 'block' }}>
                    Unified controls for approval gates & loop effort compute parameters
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsGatesModalOpen(false);
                  setIsEffortModalOpen(false);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Unified Controls - No Tabs */}

            {/* Body */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '65vh', overflowY: 'auto' }}>
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '9px',
                color: 'var(--text)',
                lineHeight: 1.5,
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                <div>
                  ℹ️ <b>Quality Gates:</b> When an approval gate is <b>ON</b>, the agent pauses execution at that step to await your explicit confirmation before advancing.
                </div>
                <div>
                  ⚡ <b>Effort Scaling:</b> For <b>LOOP</b> components, adjust reasoning depth, web crawl iterations, and retry caps. Non-loop phases execute deterministically.
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { key: 'discovery_scoping', phase: '1. Drafting', name: 'Discovery & Scoping', type: 'loop', desc: 'Interactive Q&A & trade-off debate', effortKey: 'discovery_scoping', effortDesc: 'Controls Q&A trade-off depth & option synthesis' },
                  { key: 'deep_research', phase: '2. Planning', name: 'Deep Research & Intelligence Gathering', type: 'loop', desc: 'Web searches, PDFs & competitor extraction', effortKey: 'deep_research', effortDesc: 'Controls web crawl depth, PDF extractions & paper audits' },
                  { key: 'data_analysis', phase: '2. Planning', name: 'Data Analysis & Pattern Extraction', type: 'non-loop', desc: 'Anomaly detection & metric computation (deterministic)' },
                  { key: 'strategic_synthesis', phase: '2. Planning', name: 'Strategic Synthesis & Decision Support', type: 'non-loop', desc: 'Actionable plan & decision matrix (deterministic)' },
                  { key: 'generation', phase: '3. Execution', name: 'Generation', type: 'non-loop', desc: 'Code & asset generation into Deliverables (deterministic)' },
                  { key: 'verification', phase: '3. Execution', name: 'Verification & Regeneration Loop', type: 'loop', desc: 'Gap analysis vs Strategic Synthesis & retry attempts', effortKey: 'execution_loop', effortDesc: 'Controls automated gap-fixing retry attempts' },
                  { key: 'review', phase: '4. Delivering', name: 'Review', type: 'non-loop', desc: 'Final production deliverable review (deterministic)' }
                ].map(gate => {
                  const isEnabled = approvalGates[gate.key] !== false;
                  const effortKey = gate.effortKey || gate.key;
                  const currentEffort = loopEfforts[effortKey] || 'Medium';

                  return (
                    <div
                      key={gate.key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        background: 'var(--surface-alt)',
                        border: isEnabled ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid var(--border-soft)',
                        borderRadius: '8px',
                        padding: '12px 14px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {/* Phase Header & Gate Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '7.5px', fontWeight: 800, background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent)' }}>
                              {gate.phase}
                            </span>
                            <b style={{ fontSize: '10px', color: 'var(--text-bright)' }}>{gate.name}</b>
                            <span style={{
                              fontSize: '7px',
                              fontWeight: 800,
                              background: gate.type === 'loop' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                              color: gate.type === 'loop' ? '#f59e0b' : 'var(--accent)',
                              padding: '2px 5px',
                              borderRadius: '4px'
                            }}>
                              {gate.type === 'loop' ? '🔄 LOOP' : '📄 NON-LOOP'}
                            </span>
                          </div>
                          <span style={{ fontSize: '8.5px', color: 'var(--muted)' }}>{gate.desc}</span>
                        </div>

                        <button
                          onClick={() => {
                            setApprovalGates(prev => ({ ...prev, [gate.key]: !isEnabled }));
                          }}
                          style={{
                            background: isEnabled ? '#3b82f6' : 'var(--surface)',
                            border: isEnabled ? 'none' : '1px solid var(--border-soft)',
                            color: isEnabled ? '#ffffff' : 'var(--muted)',
                            fontSize: '8.5px',
                            fontWeight: 800,
                            padding: '6px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          {isEnabled ? '🛡️ GATE ON' : '⚪ GATE OFF'}
                        </button>
                      </div>

                      {/* Loop Effort Level Selector - Only for LOOP phases */}
                      {gate.type === 'loop' && (
                        <div style={{
                          borderTop: '1px solid var(--border-soft)',
                          paddingTop: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 600 }}>
                              ⚡ <b>Loop Effort Level:</b> {gate.effortDesc}
                            </span>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: '#f59e0b' }}>
                              Current: {currentEffort}
                            </span>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                            {[
                              { val: 'Low', label: 'Low (1x)', desc: 'Fast turnaround' },
                              { val: 'Medium', label: 'Medium (2x)', desc: 'Balanced reasoning' },
                              { val: 'High', label: 'High (3x)', desc: 'Thorough analysis' },
                              { val: 'Deep', label: 'Deep (5x)', desc: 'Exhaustive search' }
                            ].map(eff => {
                              const isSel = currentEffort === eff.val;
                              return (
                                <button
                                  key={eff.val}
                                  onClick={() => setLoopEfforts(prev => ({ ...prev, [effortKey]: eff.val as any }))}
                                  style={{
                                    background: isSel ? 'rgba(245, 158, 11, 0.2)' : 'var(--surface)',
                                    border: isSel ? '1.5px solid #f59e0b' : '1px solid var(--border-soft)',
                                    borderRadius: '5px',
                                    padding: '6px 4px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: '2px',
                                    transition: 'all 0.15s ease'
                                  }}
                                >
                                  <b style={{ fontSize: '8.5px', color: isSel ? '#f59e0b' : 'var(--text)' }}>{eff.label}</b>
                                  <span style={{ fontSize: '6.5px', color: 'var(--muted)' }}>{eff.desc}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '8px', color: 'var(--muted)' }}>
                Pipeline configurations apply dynamically to all mission executions.
              </span>
              <button
                onClick={() => {
                  setToast({ message: 'Pipeline configuration updated successfully!', type: 'success', isOpen: true });
                  setIsGatesModalOpen(false);
                  setIsEffortModalOpen(false);
                }}
                className="mini accent"
                style={{ padding: '6px 14px', fontSize: '9.5px', fontWeight: 800, background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none' }}
              >
                Save Configuration ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REAL-TIME EXECUTION LOGS MODAL ================= */}
      {isLogsModalOpen && selectedMissionLogs && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            backdropFilter: 'blur(4px)'
          }}
        >
          <div style={{
            background: 'var(--surface)',
            border: '1px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '640px',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>📜</span>
                <div>
                  <b style={{ fontSize: '12px', color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Real-Time Agent Execution Logs
                  </b>
                  <span style={{ fontSize: '8.5px', color: 'var(--accent)', fontFamily: 'var(--mono)', display: 'block' }}>
                    Mission ID: {selectedMissionLogs.missionId}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '14px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  padding: '4px 8px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '60vh', overflowY: 'auto', background: '#090d16', fontFamily: 'var(--mono)' }}>
              {selectedMissionLogs.logs.map((log, idx) => (
                <div key={idx} style={{ fontSize: '9px', color: log.includes('ERROR') ? '#ef4444' : log.includes('SUCCESS') || log.includes('Verified') ? '#10b981' : log.includes('Gate') ? '#f59e0b' : '#3b82f6', lineHeight: 1.4, borderBottom: '1px dashed rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                  {log}
                </div>
              ))}
              {selectedMissionLogs.logs.length === 0 && (
                <div style={{ fontSize: '9px', color: 'var(--muted)', textAlign: 'center', padding: '20px' }}>
                  No execution logs recorded yet. Launch mission to stream runtime logs.
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span style={{ fontSize: '8px', color: 'var(--muted)' }}>
                Live stream connected • Real-time pipeline audit log
              </span>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="mini ghost"
                style={{ padding: '6px 14px', fontSize: '9.5px' }}
              >
                Close Logs ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= CUSTOM CONFIRMATION DIALOG ================= */}
      {confirmModal && confirmModal.isOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            width: '100%',
            maxWidth: '360px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Header */}
            <div style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span style={{ fontSize: '14px' }}>
                {confirmModal.isDestructive ? '⚠️' : '❓'}
              </span>
              <span style={{
                fontSize: '11px',
                fontWeight: 900,
                color: confirmModal.isDestructive ? 'var(--status-error)' : 'var(--accent)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {confirmModal.title}
              </span>
            </div>

            {/* Message Body */}
            <div style={{
              padding: '16px',
              fontSize: '10.5px',
              color: 'var(--text)',
              lineHeight: 1.5
            }}>
              {confirmModal.message}
            </div>

            {/* Buttons Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px',
              padding: '12px 16px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setConfirmModal(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '4px',
                  color: 'var(--text)',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {confirmModal.cancelText || 'Cancel'}
              </button>
              <button
                onClick={confirmModal.onConfirm}
                style={{
                  background: confirmModal.isDestructive
                    ? 'linear-gradient(135deg, var(--status-error), #b91c1c)'
                    : 'linear-gradient(135deg, var(--accent), var(--accent-active))',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '5px 16px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
                  transition: 'all 0.15s'
                }}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= IMPORT MODAL DIALOG ================= */}
      {isImportModalOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>📥</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: 'var(--accent)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--sans)'
                }}>
                  {modalSubSectionContext ? `IMPORT TO ${modalSubSectionContext.subSectionLabel.toUpperCase()} (${modalSubSectionContext.sectionType.toUpperCase()})` : dtxt.importModalTitle}
                </span>
              </div>
              <button
                onClick={() => setIsImportModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-bright)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Source Methods Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setSelectedImportMethod('local')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '9.5px',
                  fontWeight: selectedImportMethod === 'local' ? 900 : 700,
                  color: selectedImportMethod === 'local' ? 'var(--accent)' : 'var(--muted)',
                  background: selectedImportMethod === 'local' ? 'var(--surface)' : 'transparent',
                  border: 'none',
                  borderBottom: selectedImportMethod === 'local' ? '2px solid var(--accent)' : 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--sans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {dtxt.importLocalTab}
              </button>
              <button
                onClick={() => setSelectedImportMethod('google')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '9.5px',
                  fontWeight: selectedImportMethod === 'google' ? 900 : 700,
                  color: selectedImportMethod === 'google' ? 'var(--accent)' : 'var(--muted)',
                  background: selectedImportMethod === 'google' ? 'var(--surface)' : 'transparent',
                  border: 'none',
                  borderBottom: selectedImportMethod === 'google' ? '2px solid var(--accent)' : 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--sans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {dtxt.importGoogleTab}
              </button>
              <button
                onClick={() => setSelectedImportMethod('github')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '9.5px',
                  fontWeight: selectedImportMethod === 'github' ? 900 : 700,
                  color: selectedImportMethod === 'github' ? 'var(--accent)' : 'var(--muted)',
                  background: selectedImportMethod === 'github' ? 'var(--surface)' : 'transparent',
                  border: 'none',
                  borderBottom: selectedImportMethod === 'github' ? '2px solid var(--accent)' : 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--sans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {dtxt.importGithubTab}
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {modalSubSectionContext && (
                <div style={{
                  background: 'rgba(59, 130, 246, 0.08)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '9.5px',
                  color: 'var(--text-bright)'
                }}>
                  <span style={{ fontWeight: 800 }}>
                    🎯 Target Sub-Section: <b style={{ color: 'var(--accent)' }}>{modalSubSectionContext.subSectionLabel}</b> ({modalSubSectionContext.sectionType.toUpperCase()})
                  </span>
                  <span style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 700 }}>
                    Auto-categorized
                  </span>
                </div>
              )}
              {selectedImportMethod === 'local' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Raw Data Source */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '10.5px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📄</span> Ingest Raw Data Source
                    </h4>
                    
                    {/* Compact Signal Dropzone */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleFileDrop}
                      style={{
                        border: '1.5px dashed var(--border)',
                        borderRadius: '8px',
                        padding: '16px 12px',
                        textAlign: 'center',
                        background: 'var(--surface-alt)',
                        position: 'relative',
                        transition: 'border-color 0.2s ease, background 0.2s ease'
                      }}
                      className="hover:border-[var(--accent)] hover:bg-[rgba(229,147,32,0.03)]"
                    >
                      <span style={{ fontSize: '1.5rem' }}>📄 / 📁</span>
                      <p style={{ margin: '4px 0 1px', fontSize: '10px', fontWeight: 800, fontFamily: 'var(--sans)', color: 'var(--text-bright)' }}>Drag & Drop Local Files or Folders Here</p>
                      <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>Supports folders, dataset directories, PDF, JSON, TXT, CSV, DOCX and more</span>
                      
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          fontFamily: 'var(--sans)',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--text-bright)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <span>📄</span> Select File(s)
                          <input
                            type="file"
                            multiple
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                          />
                        </label>

                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          fontFamily: 'var(--sans)',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--text-bright)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <span>📁</span> Select Folder
                          <input
                            type="file"
                            {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>

                    {uploadStatus !== 'idle' && (
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontFamily: 'var(--mono)',
                        background: uploadStatus === 'success' ? 'rgba(16,185,129,0.1)' : uploadStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'var(--surface-alt)',
                        color: uploadStatus === 'success' ? '#10b981' : uploadStatus === 'error' ? '#ef4444' : 'var(--text-bright)',
                        border: '1px solid var(--border-soft)'
                      }}>
                        {uploadProgress}
                      </div>
                    )}

                    <button
                      className="mini secondary"
                      style={{ padding: '6px 10px', fontSize: '9px', fontWeight: 800, fontFamily: 'var(--sans)', background: 'var(--surface-alt)', border: '1px solid var(--border)', cursor: 'pointer', borderRadius: '4px', alignSelf: 'flex-end' }}
                      onClick={() => {
                        const signalText = prompt("Enter manual data source content (e.g. Sales list, client requests, product logs):");
                        if (signalText) {
                          const signalName = prompt("Enter source title (e.g. clients_july.json, feedback.txt):") || "manual_signal.txt";
                          handleAddRawData(signalName, signalText, { status: 'new' });
                        }
                      }}
                    >
                      + Create Manual Text Data Source
                    </button>
                  </div>

                  {/* Separator Divider */}
                  <div style={{ height: '1.5px', background: 'var(--border-soft)' }}></div>

                  {/* Project Component Section */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '10.5px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase', fontFamily: 'var(--sans)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>⚙️</span> Ingest Project Component
                    </h4>

                    {/* Inline Form to Register Project */}
                    <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Project Name / ID</label>
                        <input
                          type="text"
                          placeholder="Name (e.g. payment_gateway_v1)"
                          value={newCompName}
                          onChange={(e) => setNewCompName(e.target.value)}
                          style={{ padding: '6px 10px', fontSize: '9.5px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-bright)', outline: 'none' }}
                        />
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Component Snapshot Code or Configuration YAML</label>
                        <textarea
                          placeholder="Current code snapshot, TS implementation or config YAML..."
                          value={newCompCode}
                          onChange={(e) => setNewCompCode(e.target.value)}
                          style={{ height: '70px', padding: '6px 10px', fontSize: '9px', fontFamily: 'var(--mono)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-bright)', outline: 'none', resize: 'vertical' }}
                        />
                      </div>

                      <button
                        onClick={handleAddSystemComponent}
                        disabled={isAddingComp}
                        style={{ width: '100%', padding: '8px', fontSize: '9.5px', fontWeight: 800, fontFamily: 'var(--sans)', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        {isAddingComp ? "Registering..." : "✓ Register Manual Project Component"}
                      </button>
                    </div>

                    {/* Compact Project Dropzone */}
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleSystemFileDrop}
                      style={{
                        border: '1.5px dashed var(--border)',
                        borderRadius: '8px',
                        padding: '16px 12px',
                        textAlign: 'center',
                        background: 'var(--surface-alt)',
                        position: 'relative',
                        transition: 'border-color 0.2s ease, background 0.2s ease'
                      }}
                      className="hover:border-[var(--accent)] hover:bg-[rgba(204,122,74,0.03)]"
                    >
                      <span style={{ fontSize: '1.5rem' }}>⚙️ / 📁</span>
                      <p style={{ margin: '4px 0 1px', fontSize: '10px', fontWeight: 800, fontFamily: 'var(--sans)', color: 'var(--text-bright)' }}>Drag & Drop Project Files or Entire Codebase Folders</p>
                      <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontFamily: 'var(--sans)' }}>Saves code files, microservice folders, config YAML, or code repositories directly</span>

                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          fontFamily: 'var(--sans)',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--text-bright)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <span>⚙️</span> Select Project File(s)
                          <input
                            type="file"
                            multiple
                            onChange={handleSystemFileSelect}
                            style={{ display: 'none' }}
                          />
                        </label>

                        <label style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 10px',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          fontFamily: 'var(--sans)',
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: 'var(--text-bright)',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                        }}>
                          <span>📁</span> Select Codebase Folder
                          <input
                            type="file"
                            {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
                            onChange={handleSystemFileSelect}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>

                    {systemUploadStatus !== 'idle' && (
                      <div style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontSize: '9px',
                        fontFamily: 'var(--mono)',
                        background: systemUploadStatus === 'success' ? 'rgba(16,185,129,0.1)' : systemUploadStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'var(--surface-alt)',
                        color: systemUploadStatus === 'success' ? '#10b981' : systemUploadStatus === 'error' ? '#ef4444' : 'var(--text-bright)',
                        border: '1px solid var(--border-soft)'
                      }}>
                        {systemUploadProgress}
                      </div>
                    )}
                  </div>
                </div>
              ) : selectedImportMethod === 'google' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {!googleUser ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '24px 12px', textAlign: 'center' }}>
                      <span style={{ fontSize: '32px' }}>🌐</span>
                      <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-bright)' }}>
                        Connect to Google Drive & Sheets
                      </h4>
                      <p style={{ margin: 0, fontSize: '9px', color: 'var(--muted)', maxWidth: '320px', lineHeight: '1.5' }}>
                        Establish a secure connection with your Google Workspace to browse and import active spreadsheet tables or specifications directly into your active sandbox environment.
                      </p>
                      <button
                        onClick={handleGoogleSignIn}
                        style={{
                          background: '#fff',
                          color: '#3c4043',
                          border: '1px solid #dadce0',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          fontSize: '9px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 1px 3px rgba(60,64,67,0.1)',
                          transition: 'all 0.15s ease',
                          marginTop: '8px'
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        Sign in with Google
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {/* Connection details banner */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'rgba(16, 185, 129, 0.05)',
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        borderRadius: '6px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '7.5px', color: '#10b981', fontWeight: 800, textTransform: 'uppercase' }}>✅ Google Connected</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 700, color: 'var(--text-bright)' }}>👤 {googleUser.email}</span>
                        </div>
                        <button
                          onClick={handleGoogleLogout}
                          style={{
                            background: 'transparent',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            borderRadius: '4px',
                            color: '#ef4444',
                            fontSize: '8px',
                            fontWeight: 800,
                            padding: '4px 8px',
                            cursor: 'pointer',
                            textTransform: 'uppercase'
                          }}
                        >
                          Disconnect
                        </button>
                      </div>

                      {/* Browse and Actions */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                          onClick={() => fetchDriveFiles()}
                          disabled={isFetchingDrive}
                          style={{
                            width: '100%',
                            background: 'var(--accent)',
                            border: 'none',
                            color: '#fff',
                            padding: '8px 12px',
                            borderRadius: '6px',
                            fontSize: '9.5px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          {isFetchingDrive ? '🔄 Querying Google Drive...' : '📂 Browse Google Drive Files'}
                        </button>

                        {driveFiles.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                              Available Files ({driveFiles.length})
                            </span>
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '4px',
                              maxHeight: '220px',
                              overflowY: 'auto',
                              background: 'var(--surface-alt)',
                              padding: '6px',
                              borderRadius: '6px',
                              border: '1px solid var(--border-soft)'
                            }}>
                              {driveFiles.map((file: any) => {
                                const isSpreadsheet = file.mimeType === 'application/vnd.google-apps.spreadsheet';
                                return (
                                  <div
                                    key={file.id}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      padding: '6px 8px',
                                      borderBottom: '1px solid var(--border-soft)',
                                      fontSize: '9px',
                                      background: 'var(--surface)',
                                      borderRadius: '4px',
                                      marginBottom: '2px'
                                    }}
                                  >
                                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, marginRight: '8px' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text-bright)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {isSpreadsheet ? '📊 ' : '📄 '} {file.name}
                                      </span>
                                      <span style={{ fontSize: '7px', color: 'var(--muted)' }}>
                                        {isSpreadsheet ? 'Google Sheet' : 'Google Document'}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => handleImportDriveFile(file)}
                                      disabled={isImportingDriveFile}
                                      style={{
                                        background: 'rgba(16, 185, 129, 0.1)',
                                        border: '1px solid rgba(16, 185, 129, 0.25)',
                                        color: '#10b981',
                                        borderRadius: '4px',
                                        padding: '3px 8px',
                                        fontSize: '8px',
                                        fontWeight: 800,
                                        cursor: 'pointer'
                                      }}
                                    >
                                      Import
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <p style={{ margin: 0, padding: '16px 0', fontSize: '9px', color: 'var(--muted)', textAlign: 'center' }}>
                            Click Browse Drive to load documents and sheets.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* GitHub Connection Configuration */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    background: 'var(--surface-alt)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-soft)'
                  }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔧 GitHub Connection Details
                    </span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Owner / Organization</label>
                        <input
                          type="text"
                          placeholder="e.g. google"
                          value={githubOwner}
                          onChange={(e) => setGithubOwner(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Repository Name</label>
                        <input
                          type="text"
                          placeholder="e.g. ai-studio"
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Branch</label>
                        <input
                          type="text"
                          placeholder="main"
                          value={githubBranch}
                          onChange={(e) => setGithubBranch(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Personal Access Token (PAT)</label>
                        <input
                          type="password"
                          placeholder={githubToken ? '••••••••••••••••' : 'ghp_...'}
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    {githubToken && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '7.5px',
                        color: '#10b981',
                        fontWeight: 700,
                        marginTop: '4px'
                      }}>
                        <span>🔑 Already logged in with active token. Ready to fetch!</span>
                      </div>
                    )}
                  </div>

                  {/* Fetch & Import panel */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase' }}>
                      📥 Browse and Import Files
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Subpath in repo (optional, e.g. src/utils)"
                        value={githubPath}
                        onChange={(e) => setGithubPath(e.target.value)}
                        style={{
                          flex: 1,
                          background: 'var(--surface-alt)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-bright)',
                          fontSize: '9px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          outline: 'none'
                        }}
                      />
                      <button
                        onClick={fetchGithubRepoContents}
                        disabled={isFetchingGithub}
                        style={{
                          background: 'var(--accent)',
                          border: 'none',
                          color: '#fff',
                          padding: '6px 14px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: 800,
                          cursor: 'pointer'
                        }}
                      >
                        {isFetchingGithub ? 'Querying...' : 'Fetch Code'}
                      </button>
                    </div>

                    {githubFiles.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                        <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                          Files in repository ({githubFiles.length})
                        </span>
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          maxHeight: '180px',
                          overflowY: 'auto',
                          background: 'var(--surface-alt)',
                          padding: '6px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-soft)'
                        }}>
                          {githubFiles.map((file) => (
                            <div
                              key={file.sha}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '6px 8px',
                                borderBottom: '1px solid var(--border-soft)',
                                fontSize: '9px',
                                background: 'var(--surface)',
                                borderRadius: '4px',
                                marginBottom: '2px'
                              }}
                            >
                              <span style={{ fontWeight: 700, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: '8px' }}>
                                {file.type === 'dir' ? '📁 ' : '📄 '} {file.name}
                              </span>
                              {file.type === 'file' && (
                                <button
                                  onClick={() => handleDownloadAndImportGithubFile(file)}
                                  style={{
                                    background: 'rgba(229,147,32,0.1)',
                                    border: '1px solid rgba(229,147,32,0.25)',
                                    color: 'var(--accent)',
                                    borderRadius: '4px',
                                    padding: '3px 8px',
                                    fontSize: '8px',
                                    fontWeight: 800,
                                    cursor: 'pointer'
                                  }}
                                >
                                  Import
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ margin: 0, padding: '12px 0', fontSize: '9px', color: 'var(--muted)', textAlign: 'center' }}>
                        Connect your credentials above, specify a subpath if needed, and hit Fetch Code.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                onClick={() => setIsImportModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-bright)',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= EXPORT MODAL DIALOG ================= */}
      {isExportModalOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '20px',
            backdropFilter: 'blur(3px)'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>📤</span>
                <span style={{
                  fontSize: '11px',
                  fontWeight: 900,
                  color: '#10b981',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: 'var(--sans)'
                }}>
                  {modalSubSectionContext ? `EXPORT FROM ${modalSubSectionContext.subSectionLabel.toUpperCase()} (${modalSubSectionContext.sectionType.toUpperCase()})` : dtxt.exportModalTitle}
                </span>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-bright)',
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Target Methods Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setSelectedExportMethod('github')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '9.5px',
                  fontWeight: selectedExportMethod === 'github' ? 900 : 700,
                  color: selectedExportMethod === 'github' ? '#10b981' : 'var(--muted)',
                  background: selectedExportMethod === 'github' ? 'var(--surface)' : 'transparent',
                  border: 'none',
                  borderBottom: selectedExportMethod === 'github' ? '2px solid #10b981' : 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--sans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {dtxt.exportGithubTab}
              </button>
              <button
                onClick={() => setSelectedExportMethod('google')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: '9.5px',
                  fontWeight: selectedExportMethod === 'google' ? 900 : 700,
                  color: selectedExportMethod === 'google' ? '#10b981' : 'var(--muted)',
                  background: selectedExportMethod === 'google' ? 'var(--surface)' : 'transparent',
                  border: 'none',
                  borderBottom: selectedExportMethod === 'google' ? '2px solid #10b981' : 'none',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--sans)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {dtxt.exportGoogleTab}
              </button>
            </div>

            {/* Modal Body Scroll Container */}
            <div style={{
              padding: '20px',
              overflowY: 'auto',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              {modalSubSectionContext && (() => {
                const subSecItems = modalSubSectionContext.secItems || [];
                const isSources = modalSubSectionContext.sectionType === 'sources';
                const currentSelectedIds = isSources ? exportSelectedSourceIds : exportSelectedDeliverableIds;
                const selectedSubItems = subSecItems.filter((i: any) => currentSelectedIds.includes(i.id));

                const handleToggleSelectAll = () => {
                  if (selectedSubItems.length === subSecItems.length) {
                    if (isSources) {
                      setExportSelectedSourceIds(prev => prev.filter(id => !subSecItems.some((i: any) => i.id === id)));
                    } else {
                      setExportSelectedDeliverableIds(prev => prev.filter(id => !subSecItems.some((i: any) => i.id === id)));
                    }
                  } else {
                    const allSubIds = subSecItems.map((i: any) => i.id);
                    if (isSources) {
                      setExportSelectedSourceIds(prev => Array.from(new Set([...prev, ...allSubIds])));
                    } else {
                      setExportSelectedDeliverableIds(prev => Array.from(new Set([...prev, ...allSubIds])));
                    }
                  }
                };

                return (
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.06)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {/* Top Header Row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: 'var(--text-bright)' }}>
                          Export Sub-Section: <b style={{ color: '#10b981' }}>{modalSubSectionContext.subSectionLabel}</b> ({modalSubSectionContext.sectionType.toUpperCase()})
                        </span>
                        <span style={{ fontSize: '8.5px', color: 'var(--muted)', fontWeight: 700 }}>
                          {selectedSubItems.length} of {subSecItems.length} item(s) selected
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          style={{
                            background: 'var(--surface-alt)',
                            border: '1px solid var(--border-soft)',
                            color: 'var(--text-bright)',
                            fontSize: '8px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          {selectedSubItems.length === subSecItems.length ? '☐ Deselect All' : '☑ Select All'}
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadFilesAndFolders}
                          disabled={selectedSubItems.length === 0}
                          style={{
                            background: selectedSubItems.length > 0 ? '#10b981' : 'var(--border)',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '5px 12px',
                            borderRadius: '5px',
                            cursor: selectedSubItems.length > 0 ? 'pointer' : 'not-allowed',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            whiteSpace: 'nowrap',
                            boxShadow: selectedSubItems.length > 0 ? '0 2px 4px rgba(16, 185, 129, 0.25)' : 'none'
                          }}
                        >
                          ⬇️ Download Files & Folders ({selectedSubItems.length})
                        </button>
                      </div>
                    </div>

                    {/* Item Selection Box */}
                    {subSecItems.length > 0 ? (
                      <div style={{
                        maxHeight: '140px',
                        overflowY: 'auto',
                        background: 'var(--surface)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '6px',
                        padding: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}>
                        {subSecItems.map((item: any) => {
                          const isChecked = currentSelectedIds.includes(item.id);
                          const itemProj = item.metadata?.project_name || item.metadata?.project || 'default_project';
                          const subKey = item.metadata?.sub_section || item.sub_section || modalSubSectionContext.subSectionKey;

                          return (
                            <label
                              key={item.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '5px 8px',
                                borderRadius: '4px',
                                background: isChecked ? 'rgba(16, 185, 129, 0.1)' : 'var(--surface-alt)',
                                border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-soft)',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (isSources) {
                                    if (e.target.checked) {
                                      setExportSelectedSourceIds(prev => [...prev, item.id]);
                                    } else {
                                      setExportSelectedSourceIds(prev => prev.filter(id => id !== item.id));
                                    }
                                  } else {
                                    if (e.target.checked) {
                                      setExportSelectedDeliverableIds(prev => [...prev, item.id]);
                                    } else {
                                      setExportSelectedDeliverableIds(prev => prev.filter(id => id !== item.id));
                                    }
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '10px' }}>{isSources ? '📄' : '📦'}</span>
                              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {item.name}
                                </span>
                                <span style={{ fontSize: '7px', color: 'var(--accent)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {modalSubSectionContext.sectionType}/{subKey}/{item.name}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '8.5px', color: 'var(--muted)', fontStyle: 'italic' }}>
                        No items found in this sub-section.
                      </span>
                    )}
                  </div>
                );
              })()}
              {selectedExportMethod === 'github' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* GitHub Connection Configuration */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    background: 'var(--surface-alt)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-soft)'
                  }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      🔧 GitHub Connection Details
                    </span>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Owner / Organization</label>
                        <input
                          type="text"
                          placeholder="e.g. google"
                          value={githubOwner}
                          onChange={(e) => setGithubOwner(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Repository Name</label>
                        <input
                          type="text"
                          placeholder="e.g. ai-studio"
                          value={githubRepo}
                          onChange={(e) => setGithubRepo(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Branch</label>
                        <input
                          type="text"
                          placeholder="main"
                          value={githubBranch}
                          onChange={(e) => setGithubBranch(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Personal Access Token (PAT)</label>
                        <input
                          type="password"
                          placeholder={githubToken ? '••••••••••••••••' : 'ghp_...'}
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          style={{
                            background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    {githubToken && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '7.5px',
                        color: '#10b981',
                        fontWeight: 700,
                        marginTop: '4px'
                      }}>
                        <span>🔒 Authenticated & configured. Ready to write code directly to this branch.</span>
                      </div>
                    )}
                  </div>

                  {/* Component Export configuration */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <span style={{ fontSize: '8.5px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase' }}>
                      ⚙️ Component Selection & Commit Configuration
                    </span>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Target System Component</label>
                      <select
                        value={githubExportTargetId}
                        onChange={(e) => setGithubExportTargetId(e.target.value)}
                        style={{
                          background: 'var(--surface-alt)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-bright)',
                          fontSize: '9px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          outline: 'none',
                          width: '100%'
                        }}
                      >
                        <option value="">-- Select Component to Push --</option>
                        {systemComponents.map((sc: any) => (
                          <option key={sc.id} value={sc.id}>{sc.name} ({sc.role})</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Target File Path in Repo</label>
                        <input
                          type="text"
                          placeholder="e.g. src/components/Engine.ts"
                          value={githubExportPath}
                          onChange={(e) => setGithubExportPath(e.target.value)}
                          style={{
                            background: 'var(--surface-alt)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            outline: 'none'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Commit Message</label>
                        <input
                          type="text"
                          placeholder="Commit message"
                          value={githubExportCommit}
                          onChange={(e) => setGithubExportCommit(e.target.value)}
                          style={{
                            background: 'var(--surface-alt)',
                            border: '1px solid var(--border)',
                            color: 'var(--text-bright)',
                            fontSize: '9px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>

                    <button
                      onClick={handleExportSystemComponentToGithub}
                      disabled={isExportingGithub}
                      style={{
                        background: '#10b981',
                        border: 'none',
                        color: '#fff',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        fontSize: '9.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        marginTop: '8px',
                        boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)'
                      }}
                    >
                      {isExportingGithub ? '📤 Committing directly to branch...' : '🚀 Push Code to GitHub'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', padding: '36px 12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '32px' }}>🌐</span>
                  <h4 style={{ margin: 0, fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', color: 'var(--text-bright)' }}>
                    Exporting to Google Workspace (Coming Soon)
                  </h4>
                  <p style={{ margin: 0, fontSize: '9px', color: 'var(--muted)', maxWidth: '320px', lineHeight: '1.5' }}>
                    Google Drive backups, Sheet synchronization, and Document spec exports are being prepared for high-fidelity export targets. Please use GitHub Repository integration to save code segments in the meantime.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '8px'
            }}>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text-bright)',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ================= CUSTOM TOAST NOTIFICATION ================= */}
      {toast && toast.isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'var(--surface)',
          border: `1.5px solid ${
            toast.type === 'success' ? 'var(--status-success)' :
            toast.type === 'error' ? 'var(--status-error)' : 'var(--accent)'
          }`,
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
          color: 'var(--text)',
          fontSize: '10px',
          fontWeight: 700,
          fontFamily: 'var(--mono)',
          transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          animation: 'slideIn 0.3s ease-out',
          maxWidth: '300px'
        }}>
          <span style={{ fontSize: '13px' }}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.3 }}>
            {toast.message}
          </span>
          <button
            onClick={() => setToast(prev => prev ? { ...prev, isOpen: false } : null)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '11px',
              cursor: 'pointer',
              padding: '0 2px',
              fontWeight: 'bold'
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ================= BACKLOG / STRATEGIC INTENT EDITOR MODAL ================= */}
      {isBacklogEditorOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '24px',
            backdropFilter: 'blur(4px)',
            fontFamily: 'var(--mono)'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '85vh',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>📋</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {dtxt.backlogModalTitle}
                </span>
              </div>
              <button
                onClick={() => setIsBacklogEditorOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <div style={{ padding: '12px 20px', fontSize: '9px', color: 'var(--muted)', borderBottom: '1px solid var(--border-soft)', lineHeight: 1.4 }}>
              Define the prioritized roadmap of goals and intent models that guide the AI development. Click <b>▲</b> or <b>▼</b> to change priority.
            </div>

            {/* Content List */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editedBacklog.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: '9.5px', fontStyle: 'italic' }}>
                  No goals defined. Click "Add Strategic Goal" to begin.
                </div>
              ) : (
                editedBacklog.map((item, idx) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    background: 'var(--surface-alt)',
                    border: `1px solid ${item.type === 'suggested' ? 'rgba(245,158,11,0.35)' : 'rgba(16,185,129,0.25)'}`,
                    padding: '6px 10px', borderRadius: '6px'
                  }}>
                    <span style={{ fontSize: '9px', fontWeight: 900, color: '#10b981', minWidth: '20px' }}>#{idx + 1}</span>
                    {/* Type badge */}
                    <span style={{
                      fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                      padding: '2px 5px', borderRadius: '3px', flexShrink: 0,
                      background: item.type === 'suggested' ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.12)',
                      color: item.type === 'suggested' ? '#f59e0b' : '#10b981',
                      border: `1px solid ${item.type === 'suggested' ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.25)'}`
                    }}>{item.type === 'suggested' ? 'SUGGESTED' : 'VALIDATED'}</span>
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => {
                        const copy = [...editedBacklog];
                        copy[idx] = { ...copy[idx], text: e.target.value, type: 'validated' };
                        setEditedBacklog(copy);
                      }}
                      style={{
                        background: 'transparent', border: 'none',
                        color: 'var(--text-bright)', fontSize: '10px',
                        flex: 1, outline: 'none', fontFamily: 'var(--mono)'
                      }}
                      placeholder={`Goal #${idx + 1}...`}
                    />
                    {/* Action controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {item.type === 'suggested' && (
                        <button
                          onClick={() => { const c=[...editedBacklog]; c[idx]={...c[idx],type:'validated'}; setEditedBacklog(c); }}
                          style={{ background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',borderRadius:'3px',color:'#10b981',fontSize:'7.5px',fontWeight:800,padding:'2px 5px',cursor:'pointer',flexShrink:0 }}
                          title="Mark as Validated"
                        >✓ Validate</button>
                      )}
                      <button
                        onClick={() => {
                          if (idx === 0) return;
                          const copy = [...editedBacklog];
                          const t = copy[idx]; copy[idx] = copy[idx - 1]; copy[idx - 1] = t;
                          if (copy[idx - 1].type === 'suggested') copy[idx - 1] = { ...copy[idx - 1], type: 'validated' };
                          setEditedBacklog(copy);
                        }}
                        disabled={idx === 0}
                        style={{ background:'rgba(255,255,255,0.02)',border:'1px solid var(--border-soft)',borderRadius:'3px',color:idx===0?'var(--muted-dark)':'var(--text)',fontSize:'8px',padding:'3px 6px',cursor:idx===0?'not-allowed':'pointer' }}
                        title="Move Up"
                      >▲</button>
                      <button
                        onClick={() => {
                          if (idx === editedBacklog.length - 1) return;
                          const copy = [...editedBacklog];
                          const t = copy[idx]; copy[idx] = copy[idx + 1]; copy[idx + 1] = t;
                          if (copy[idx + 1].type === 'suggested') copy[idx + 1] = { ...copy[idx + 1], type: 'validated' };
                          setEditedBacklog(copy);
                        }}
                        disabled={idx === editedBacklog.length - 1}
                        style={{ background:'rgba(255,255,255,0.02)',border:'1px solid var(--border-soft)',borderRadius:'3px',color:idx===editedBacklog.length-1?'var(--muted-dark)':'var(--text)',fontSize:'8px',padding:'3px 6px',cursor:idx===editedBacklog.length-1?'not-allowed':'pointer' }}
                        title="Move Down"
                      >▼</button>
                      <button
                        onClick={() => {
                          const copy = editedBacklog.filter((_,i)=>i!==idx);
                          setEditedBacklog(copy);
                          if (copy.length === 0) {
                            const autoGoals=[ "Synthesize customer chat transcripts (csv) to align with Gemini recommendation templates.", "Conduct automated Meta/Google conversion rate telemetry checks for campaign budget rationalization.", "Review SMTP transaction throughput to optimize cart-abandonment trigger reliability.", "Validate product catalog pricing margins against regional multi-channel logs." ].map(t=>mkBacklogItem(t,'validated'));
                            setEditedBacklog(autoGoals);
                            setToast({ message:"⚡ Backlog cleared! Agent vision has auto-generated next strategic goals.", type:'info', isOpen:true });
                          }
                        }}
                        style={{ background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'3px',color:'#ef4444',fontSize:'8px',padding:'3px 6px',cursor:'pointer' }}
                        title="Delete goal"
                      >🗑️</button>
                    </div>
                  </div>
                ))
              )}

              {/* Add New Input Row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Type new strategic goal here..."
                  value={newBacklogItemText}
                  onChange={(e) => setNewBacklogItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newBacklogItemText.trim()) {
                      setEditedBacklog([...editedBacklog, mkBacklogItem(newBacklogItemText.trim(), 'validated')]);
                      setNewBacklogItemText('');
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.18)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-bright)',
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => {
                    if (newBacklogItemText.trim()) {
                      setEditedBacklog([...editedBacklog, mkBacklogItem(newBacklogItemText.trim(), 'validated')]);
                      setNewBacklogItemText('');
                    }
                  }}
                  style={{
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10b981',
                    borderRadius: '6px',
                    padding: '0 16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ＋ Add Goal
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setIsBacklogEditorOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '5px',
                  color: 'var(--text)',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveBacklog(editedBacklog)}
                disabled={isSavingBacklog}
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#fff',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '6px 18px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)'
                }}
              >
                {isSavingBacklog ? 'Saving...' : '💾 Save Intent'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= REVIEW QUEUE EDITOR MODAL ================= */}
      {isReviewEditorOpen && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '24px',
            backdropFilter: 'blur(4px)',
            fontFamily: 'var(--mono)'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '85vh',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.08) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🔍</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {dtxt.reviewModalTitle}
                </span>
              </div>
              <button
                onClick={() => setIsReviewEditorOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Description */}
            <div style={{ padding: '12px 20px', fontSize: '9px', color: 'var(--muted)', borderBottom: '1px solid var(--border-soft)', lineHeight: 1.4 }}>
              Manage active verification queue items. Click <b>▲</b> or <b>▼</b> to change priority.
            </div>

            {/* Content List */}
            <div style={{ padding: '20px', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {editedReviewQueue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: '9.5px', fontStyle: 'italic' }}>
                  No reviews pending. Click "Add Review Item" to begin.
                </div>
              ) : (
                editedReviewQueue.map((item, idx) => {
                  const label = typeof item === 'string' ? item : (item.label || item.name || 'Verification');
                  const itemType: 'suggested' | 'validated' = (typeof item === 'object' && item?.type) ? item.type : 'validated';
                  return (
                    <div key={idx} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      background: 'var(--surface-alt)',
                      border: `1px solid ${itemType === 'suggested' ? 'rgba(245,158,11,0.35)' : 'rgba(244,63,94,0.25)'}`,
                      padding: '6px 10px', borderRadius: '6px'
                    }}>
                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#f43f5e', minWidth: '20px' }}>#{idx + 1}</span>
                      {/* Type badge */}
                      <span style={{
                        fontSize: '7px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em',
                        padding: '2px 5px', borderRadius: '3px', flexShrink: 0,
                        background: itemType === 'suggested' ? 'rgba(245,158,11,0.15)' : 'rgba(244,63,94,0.1)',
                        color: itemType === 'suggested' ? '#f59e0b' : '#f43f5e',
                        border: `1px solid ${itemType === 'suggested' ? 'rgba(245,158,11,0.3)' : 'rgba(244,63,94,0.25)'}`
                      }}>{itemType === 'suggested' ? 'SUGGESTED' : 'VALIDATED'}</span>
                      <input
                        type="text"
                        value={label}
                        onChange={(e) => {
                          const copy = [...editedReviewQueue];
                          if (typeof item === 'string') {
                            copy[idx] = { label: e.target.value, type: 'validated' };
                          } else {
                            copy[idx] = { ...item, label: e.target.value, type: 'validated' };
                          }
                          setEditedReviewQueue(copy);
                        }}
                        style={{
                          background: 'transparent', border: 'none',
                          color: 'var(--text-bright)', fontSize: '10px',
                          flex: 1, outline: 'none', fontFamily: 'var(--mono)'
                        }}
                        placeholder={`Review Item #${idx + 1}...`}
                      />
                      {/* Action controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {itemType === 'suggested' && (
                          <button
                            onClick={() => {
                              const copy = [...editedReviewQueue];
                              copy[idx] = typeof item === 'string'
                                ? { label: item, type: 'validated' }
                                : { ...item, type: 'validated' };
                              setEditedReviewQueue(copy);
                            }}
                            style={{ background:'rgba(244,63,94,0.1)',border:'1px solid rgba(244,63,94,0.3)',borderRadius:'3px',color:'#f43f5e',fontSize:'7.5px',fontWeight:800,padding:'2px 5px',cursor:'pointer',flexShrink:0 }}
                            title="Mark as Validated"
                          >✓ Validate</button>
                        )}
                        <button
                          onClick={() => {
                            if (idx === 0) return;
                            const copy = [...editedReviewQueue];
                            const t = copy[idx]; copy[idx] = copy[idx - 1]; copy[idx - 1] = t;
                            setEditedReviewQueue(copy);
                          }}
                          disabled={idx === 0}
                          style={{ background:'rgba(255,255,255,0.02)',border:'1px solid var(--border-soft)',borderRadius:'3px',color:idx===0?'var(--muted-dark)':'var(--text)',fontSize:'8px',padding:'3px 6px',cursor:idx===0?'not-allowed':'pointer' }}
                          title="Move Up"
                        >▲</button>
                        <button
                          onClick={() => {
                            if (idx === editedReviewQueue.length - 1) return;
                            const copy = [...editedReviewQueue];
                            const t = copy[idx]; copy[idx] = copy[idx + 1]; copy[idx + 1] = t;
                            setEditedReviewQueue(copy);
                          }}
                          disabled={idx === editedReviewQueue.length - 1}
                          style={{ background:'rgba(255,255,255,0.02)',border:'1px solid var(--border-soft)',borderRadius:'3px',color:idx===editedReviewQueue.length-1?'var(--muted-dark)':'var(--text)',fontSize:'8px',padding:'3px 6px',cursor:idx===editedReviewQueue.length-1?'not-allowed':'pointer' }}
                          title="Move Down"
                        >▼</button>
                        <button
                          onClick={() => setEditedReviewQueue(editedReviewQueue.filter((_,i)=>i!==idx))}
                          style={{ background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'3px',color:'#ef4444',fontSize:'8px',padding:'3px 6px',cursor:'pointer' }}
                          title="Delete Item"
                        >🗑️</button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Add New Input Row */}
              <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <input
                  type="text"
                  placeholder="Type new review item here..."
                  value={newReviewItemText}
                  onChange={(e) => setNewReviewItemText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newReviewItemText.trim()) {
                      setEditedReviewQueue([...editedReviewQueue, newReviewItemText.trim()]);
                      setNewReviewItemText('');
                    }
                  }}
                  style={{
                    flex: 1,
                    background: 'rgba(0,0,0,0.18)',
                    border: '1px dashed var(--border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    color: 'var(--text-bright)',
                    fontSize: '10px',
                    fontFamily: 'var(--mono)',
                    outline: 'none'
                  }}
                />
                <button
                  onClick={() => {
                    if (newReviewItemText.trim()) {
                      setEditedReviewQueue([...editedReviewQueue, newReviewItemText.trim()]);
                      setNewReviewItemText('');
                    }
                  }}
                  style={{
                    background: 'rgba(244, 63, 94, 0.1)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    color: '#f43f5e',
                    borderRadius: '6px',
                    padding: '0 16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer'
                  }}
                >
                  ＋ Add Item
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              padding: '14px 20px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setIsReviewEditorOpen(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '5px',
                  color: 'var(--text)',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveReviewQueue(editedReviewQueue)}
                disabled={isSavingReview}
                style={{
                  background: 'linear-gradient(135deg, #f43f5e, #be123c)',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#fff',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '6px 18px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(244, 63, 94, 0.25)'
                }}
              >
                {isSavingReview ? 'Saving...' : '💾 Save Review Queue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= STRATEGIC BACKLOG ITEM DETAIL MODAL ================= */}
      {activeBacklogItem && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '24px',
            backdropFilter: 'blur(4px)',
            fontFamily: 'var(--mono)'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.08) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>📋</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {dtxt.backlogItemTitle}
                </span>
              </div>
              <button
                onClick={() => setActiveBacklogItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  Strategic Goal
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: 'var(--text-bright)',
                  fontSize: '11px',
                  fontWeight: 700,
                  wordBreak: 'break-all',
                  lineHeight: 1.4
                }}>
                  {typeof activeBacklogItem === 'string' ? activeBacklogItem : JSON.stringify(activeBacklogItem)}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  ✍️ Add Execution Instructions / Specifications
                </div>
                <textarea
                  value={backlogFeedbackText}
                  onChange={(e) => setBacklogFeedbackText(e.target.value)}
                  placeholder="Provide execution details or custom context for the agent (e.g. 'Use Redis v7, cache invalidation after 5m', 'Run tests first'...)"
                  style={{
                    width: '100%',
                    height: '64px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-bright)',
                    fontSize: '9.5px',
                    padding: '8px',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'var(--mono)'
                  }}
                />
              </div>

              {/* Action Buttons list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>

                <button
                  onClick={() => {
                    const label = typeof activeBacklogItem === 'string' ? activeBacklogItem : JSON.stringify(activeBacklogItem);
                    const prompt = `Please execute this strategic goal from our backlog: "${label}"${backlogFeedbackText ? `\n\nInstructions: ${backlogFeedbackText}` : ''}`;
                    setChatMessage(prompt);
                    setToast({
                      message: 'Loaded goal and instructions into chat composer!',
                      type: 'info',
                      isOpen: true
                    });
                    setActiveBacklogItem(null);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '10px 16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  ⚡ Execute Goal / Send to Agent
                </button>

                <button
                  onClick={() => handleArchiveBacklogItem(typeof activeBacklogItem === 'string' ? activeBacklogItem : JSON.stringify(activeBacklogItem))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '6px',
                    color: '#ef4444',
                    padding: '10px 16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                  className="hover:bg-[rgba(239,68,68,0.2)]"
                >
                  🗑️ Archive / Delete Goal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= REVIEW QUEUE / COMPONENT AUDIT DETAIL MODAL ================= */}
      {activeReviewItem && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.82)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '24px',
            backdropFilter: 'blur(4px)',
            fontFamily: 'var(--mono)'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            background: 'var(--surface)',
            border: '1.5px solid var(--border-soft)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '440px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 20px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'linear-gradient(90deg, rgba(244, 63, 94, 0.08) 0%, transparent 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>🔍</span>
                <span style={{ fontSize: '11px', fontWeight: 900, color: '#f43f5e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {dtxt.reviewItemTitle}
                </span>
              </div>
              <button
                onClick={() => setActiveReviewItem(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <div style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  Target Component / Task
                </div>
                <div style={{
                  background: 'rgba(0,0,0,0.25)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  color: 'var(--text-bright)',
                  fontSize: '11px',
                  fontWeight: 700,
                  wordBreak: 'break-all',
                  lineHeight: 1.4
                }}>
                  {typeof activeReviewItem === 'string' ? activeReviewItem : (activeReviewItem.label || activeReviewItem.name || 'Component Verification')}
                </div>
                {activeReviewItem && typeof activeReviewItem === 'object' && activeReviewItem.description && (
                  <div style={{ fontSize: '9px', color: 'var(--text-bright)', marginTop: '6px', fontStyle: 'italic', opacity: 0.85 }}>
                    Description: {activeReviewItem.description}
                  </div>
                )}
                {activeReviewItem && typeof activeReviewItem === 'object' && activeReviewItem.userResponse && (
                  <div style={{
                    fontSize: '9px',
                    color: '#10b981',
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.2)',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    marginTop: '8px'
                  }}>
                    <b>Last Feedback submitted:</b> "{activeReviewItem.userResponse}"
                  </div>
                )}
              </div>

              <div>
                <div style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  ✍️ Write Review Response / Feedback
                </div>
                <textarea
                  value={reviewFeedbackText}
                  onChange={(e) => setReviewFeedbackText(e.target.value)}
                  placeholder="Provide feedback on this implementation..."
                  style={{
                    width: '100%',
                    height: '64px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-bright)',
                    fontSize: '9.5px',
                    padding: '8px',
                    resize: 'none',
                    outline: 'none',
                    fontFamily: 'var(--mono)'
                  }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '8px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>
                  🔄 Re-entry Loop Target (Custom Entry):
                </div>
                <select
                  value={reviewCustomEntryLoop}
                  onChange={(e) => setReviewCustomEntryLoop(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                    color: 'var(--text-bright)',
                    fontSize: '9px',
                    padding: '6px 8px',
                    outline: 'none',
                    fontFamily: 'var(--mono)',
                    cursor: 'pointer'
                  }}
                >
                  <option value="execution">⚡ Execution Loop (Default - Re-runs Generation & Verification)</option>
                  <option value="drafting">💡 Drafting Loop (Discovery & Scoping - Re-evaluates Brief)</option>
                  <option value="planning">📊 Planning Loop (Strategic Synthesis & Decision Support)</option>
                  <option value="custom">🛠️ Custom Loop Entry (Custom feedback loop execution)</option>
                </select>
                <div style={{ fontSize: '7.5px', color: 'var(--muted)', marginTop: '3px', lineHeight: '1.2' }}>
                  Unaccepted review items are <b>always relocated to Deliverables/Executions</b>.
                </div>
              </div>

              {/* Action Buttons list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>

                <button
                  onClick={() => {
                    if (reviewFeedbackText.trim()) {
                      processReviewResponse(activeReviewItem, reviewFeedbackText.trim(), reviewCustomEntryLoop);
                      setReviewFeedbackText('');
                    } else {
                      setToast({
                        message: 'Please write some feedback before submitting.',
                        type: 'error',
                        isOpen: true
                      });
                    }
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '10px 16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)'
                  }}
                >
                  ✉️ Submit Response to Agent
                </button>

                <button
                  onClick={() => handleArchiveReviewItem(typeof activeReviewItem === 'string' ? activeReviewItem : activeReviewItem.label || activeReviewItem.name || activeReviewItem)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    background: 'linear-gradient(135deg, #10b981, #059669)',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    padding: '10px 16px',
                    fontSize: '10px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)'
                  }}
                >
                  ✅ Mark Done & Resolve Component
                </button>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setActiveReviewItem(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '5px',
                  color: 'var(--text)',
                  fontSize: '9.5px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  cursor: 'pointer'
                }}
              >
                Close & Review Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= DETAILED MISSION CONTROL PANEL OVERLAY ================= */}
      {selectedMission && (
        <div
          className="dashboard-modal-overlay"
          style={{
            background: 'rgba(9, 13, 22, 0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div dir={uiLang === 'AR' ? 'rtl' : 'ltr'} style={{
            width: 'min(64rem, 95vw)',
            height: 'min(42rem, 90vh)',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Header */}
            {(() => {
              const category = selectedMission.type || selectedMission.category || 'standard';
              const phaseClass = getMissionStatus(selectedMission) || 'planning';
              const catLabel = getCategoryLabel(category);
              
              // Color themes for categories
              const catColors: Record<string, { bg: string; text: string; border: string }> = {
                analytics: { bg: 'rgba(245, 158, 11, 0.12)', text: '#f59e0b', border: 'rgba(245, 158, 11, 0.3)' },
                deep_research: { bg: 'rgba(139, 92, 246, 0.12)', text: '#8b5cf6', border: 'rgba(139, 92, 246, 0.3)' },
                brainstorming: { bg: 'rgba(236, 72, 153, 0.12)', text: '#ec4899', border: 'rgba(236, 72, 153, 0.3)' },
                standard: { bg: 'rgba(99, 102, 241, 0.12)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' }
              };
              const theme = catColors[category] || { bg: 'rgba(16, 185, 129, 0.12)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };

              return (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 20px',
                  borderBottom: '2px solid var(--border)',
                  background: 'var(--surface-alt)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '1.6rem' }}>
                      {category === 'analytics' ? '📊' : category === 'deep_research' ? '🔬' : category === 'brainstorming' ? '🧠' : category.startsWith('system_') ? '⚙️' : '🎯'}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <b style={{ fontSize: '14px', color: 'var(--text)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {selectedMission.id.replace(/_/g, ' ')}
                        </b>
                        
                        {/* Category Badge */}
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: theme.bg,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                          letterSpacing: '0.03em'
                        }}>
                          {catLabel.toUpperCase()}
                        </span>

                        {/* Phase Pill Badge */}
                        <span style={{
                          fontSize: '8px',
                          fontWeight: 900,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: phaseClass === 'drafting' ? 'rgba(14, 165, 233, 0.15)' : phaseClass === 'planning' ? 'rgba(245, 158, 11, 0.15)' : phaseClass === 'execution' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: phaseClass === 'drafting' ? '#0ea5e9' : phaseClass === 'planning' ? '#f59e0b' : phaseClass === 'execution' ? '#8b5cf6' : '#10b981',
                          border: '1px solid currentColor'
                        }}>
                          {phaseClass === 'drafting' ? '📝 NEW / DRAFTING' : phaseClass === 'planning' ? '📋 PLANNING' : phaseClass === 'execution' ? '⚡ EXECUTION' : '✅ DONE'}
                        </span>
                      </div>
                      <span style={{ fontSize: '9px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                        MISSION ID: <span style={{ color: 'var(--accent-2)', fontWeight: 700 }}>{selectedMission.id}</span>
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedMission(null)}
                    className="fw-close-btn"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '14px',
                      cursor: 'pointer',
                      color: 'var(--muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })()}

            {/* Content Body Layout */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '3fr 2fr', minHeight: 0 }}>
              
              {/* Left Column: Flow Control, Category Inputs, Action Engine & QA */}
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', overflowY: 'auto', borderInlineEnd: '1px solid var(--border-soft)' }}>
                
                {/* 1. Major Phase Navigator Tabs */}
                <div>
                  <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    🚩 Mission Phase Selector
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
                    {[
                      { key: 'drafting', label: '📝 NEW' },
                      { key: 'planning', label: '📋 PLANNING' },
                      { key: 'execution', label: '⚡ EXECUTION' },
                      { key: 'archive', label: '✅ DONE' }
                    ].map((phase) => {
                      const isActive = getMissionStatus(selectedMission) === phase.key;
                      return (
                        <button
                          key={phase.key}
                          onClick={() => handleUpdateMissionStatus(selectedMission, phase.key)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '5px',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--accent-2)' : 'var(--border-soft)',
                            background: isActive ? 'var(--surface-alt)' : 'transparent',
                            color: isActive ? 'var(--accent-2)' : 'var(--muted)',
                            fontSize: '9px',
                            fontWeight: isActive ? 800 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            textAlign: 'center'
                          }}
                        >
                          {phase.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Step Pipeline Sequence Chips */}
                <div>
                  <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    📈 Sequential Step Pipeline (Category-Aware)
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '5px' }}>
                    {getStepsForCategory(selectedMission.type || selectedMission.category || 'standard').map((step, idx) => {
                      const isActive = selectedMission.phase === step.key;
                      return (
                        <button
                          key={step.key}
                          onClick={() => handleUpdateMissionField(selectedMission, ['phase'], step.key)}
                          style={{
                            padding: '6px 8px',
                            borderRadius: '5px',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--accent-2)' : 'var(--border-soft)',
                            background: isActive ? 'rgba(16, 185, 129, 0.08)' : 'var(--surface-alt)',
                            color: isActive ? 'var(--accent-2)' : 'var(--text)',
                            fontSize: '9px',
                            fontWeight: isActive ? 800 : 500,
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontSize: '7.5px', opacity: 0.7, fontFamily: 'var(--mono)' }}>#{idx + 1}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{step.label}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Step Input & Output Manifest */}
                {(() => {
                  const category = selectedMission.type || selectedMission.category || 'standard';
                  const steps = getStepsForCategory(category);
                  const currentStep = steps.find(s => s.key === selectedMission.phase) || steps[0];
                  return (
                    <div style={{
                      background: 'rgba(99, 102, 241, 0.04)',
                      border: '1px solid rgba(99, 102, 241, 0.15)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          ⚡ Active Step Manifest
                        </span>
                        <span style={{ fontSize: '7.5px', background: 'var(--surface)', padding: '1px 5px', borderRadius: '3px', border: '1px solid var(--border-soft)', fontFamily: 'var(--mono)', color: 'var(--text-bright)' }}>
                          Mode: {currentStep.mode}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text)' }}>
                        {currentStep.label}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', borderTop: '1px solid var(--border-soft)', paddingTop: '6px', marginTop: '2px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>📥 Ingests</span>
                          <span style={{ fontSize: '8.5px', color: 'var(--text-secondary)', lineHeight: '1.2' }}>{currentStep.input}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '7px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>📤 Outputs</span>
                          <span style={{ fontSize: '8.5px', color: 'var(--text-secondary)', lineHeight: '1.2' }}>{currentStep.output}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* 4. CATEGORY & PHASE-TAILORED INGEST SPECIFICATIONS PANEL */}
                {(() => {
                  const category = selectedMission.type || selectedMission.category || 'standard';
                  const phase = getMissionStatus(selectedMission) || 'planning';
                  const inputs = selectedMission.inputs || {};

                  return (
                    <div style={{
                      background: 'rgba(59, 130, 246, 0.04)',
                      border: '1.5px solid rgba(59, 130, 246, 0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          📥 Ingest Specifications ({getCategoryLabel(category).toUpperCase()})
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '7px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                            PHASE: {phase.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {category === 'analytics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Target Projects / Datasets</span>
                              <input
                                type="text"
                                value={inputs.target_dataset || ''}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'target_dataset'], e.target.value)}
                                placeholder="e.g. ecom_orders_2026.csv, user_sessions"
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: '#3b82f6',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  fontFamily: 'var(--mono)',
                                  padding: '3px 6px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>KPI Metrics</span>
                              <input
                                type="text"
                                value={inputs.kpi_metrics || ''}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'kpi_metrics'], e.target.value)}
                                placeholder="Conversion Rate, CAC, LTV, Retention"
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '3px 6px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Breakdown Dimensions</span>
                            <input
                              type="text"
                              value={inputs.dimensions || ''}
                              onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'dimensions'], e.target.value)}
                              placeholder="Region / Geography, Cohort Month, Device Type"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border-soft)',
                                borderRadius: '4px',
                                color: '#8b5cf6',
                                fontSize: '8.5px',
                                fontWeight: 600,
                                padding: '3px 6px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {category === 'deep_research' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface)', padding: '5px 8px', borderRadius: '5px', border: '1px solid var(--border-soft)' }}>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                              Grounding Engine Source
                            </span>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {[
                                { key: 'llm', label: '🔒 LLM' },
                                { key: 'web', label: '🌐 Web' },
                                { key: 'youtube', label: '▶️ YouTube' },
                                { key: 'web_youtube', label: '⚡ Web+YouTube' }
                              ].map(src => {
                                const currentSrc = inputs.source_type || (inputs.youtube_research_enabled ? 'web_youtube' : 'web');
                                const isSelected = currentSrc === src.key;
                                return (
                                  <button
                                    type="button"
                                    key={src.key}
                                    onClick={() => {
                                      handleUpdateMissionField(selectedMission, ['inputs', 'source_type'], src.key);
                                      handleUpdateMissionField(selectedMission, ['inputs', 'youtube_research_enabled'], src.key === 'youtube' || src.key === 'web_youtube');
                                      setToast({ message: `Grounding set to ${src.label}`, type: 'success', isOpen: true });
                                    }}
                                    style={{
                                      background: isSelected ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                                      border: isSelected ? '1px solid #ef4444' : '1px solid var(--border-soft)',
                                      color: isSelected ? '#ef4444' : 'var(--muted)',
                                      padding: '1px 5px',
                                      borderRadius: '3px',
                                      fontSize: '7.5px',
                                      fontWeight: 800,
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {src.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Research Topic</span>
                              <input
                                type="text"
                                value={inputs.research_topic || ''}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'research_topic'], e.target.value)}
                                placeholder="e.g. Competitive AI Agent Architecture Audit"
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '3px 6px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Search Depth</span>
                              <select
                                value={inputs.research_depth || 'standard'}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'research_depth'], e.target.value)}
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: '#ef4444',
                                  fontSize: '8.5px',
                                  fontWeight: 800,
                                  padding: '3px 4px',
                                  outline: 'none'
                                }}
                              >
                                <option value="standard">STANDARD (10+ Sources)</option>
                                <option value="deep">DEEP (25+ Sources)</option>
                                <option value="exhaustive">EXHAUSTIVE (50+ Sources)</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Target Sources</span>
                            <input
                              type="text"
                              value={inputs.target_sources || ''}
                              onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'target_sources'], e.target.value)}
                              placeholder="ArXiv Papers, YouTube Transcripts, Engineering Repos, SEC Filings"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border-soft)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                fontSize: '8.5px',
                                padding: '3px 6px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {category === 'brainstorming' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Brief Theme</span>
                              <input
                                type="text"
                                value={inputs.creative_brief || ''}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'creative_brief'], e.target.value)}
                                placeholder="Autonomous Workflow Automation"
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: '#ec4899',
                                  fontSize: '9px',
                                  fontWeight: 700,
                                  padding: '3px 6px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Thinking Framework</span>
                              <select
                                value={inputs.thinking_framework || 'McKinsey 7S Framework'}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'thinking_framework'], e.target.value)}
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                  fontSize: '8.5px',
                                  fontWeight: 700,
                                  padding: '3px 4px',
                                  outline: 'none'
                                }}
                              >
                                <option value="McKinsey 7S Framework">McKinsey 7S Framework</option>
                                <option value="First Principles Decomposition">First Principles Decomposition</option>
                                <option value="SCAMPER Ideation Vector">SCAMPER Ideation Vector</option>
                                <option value="Six Thinking Hats">Six Thinking Hats</option>
                                <option value="TRIZ Systematic Innovation">TRIZ Systematic Innovation</option>
                              </select>
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Constraints</span>
                            <input
                              type="text"
                              value={inputs.constraints || ''}
                              onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'constraints'], e.target.value)}
                              placeholder="Zero external API dependencies, <100ms latency threshold"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border-soft)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                fontSize: '8.5px',
                                padding: '3px 6px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {category.startsWith('system_') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {category === 'system_build' && (
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '4px 8px', borderRadius: '4px', fontSize: '8px', color: '#10b981', fontWeight: 700 }}>
                              ⚙️ SYSTEM BUILD (Fresh Build from Idea / Text Blueprint)
                            </div>
                          )}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Target Code Path</span>
                              <input
                                type="text"
                                value={inputs.target_path || ''}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'target_path'], e.target.value)}
                                placeholder="/frontend-next/app/dashboard/page.tsx"
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: 'var(--text)',
                                  fontSize: '8.5px',
                                  fontWeight: 700,
                                  fontFamily: 'var(--mono)',
                                  padding: '3px 6px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Tech Stack Specs</span>
                              <input
                                type="text"
                                value={inputs.tech_stack || ''}
                                onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'tech_stack'], e.target.value)}
                                placeholder="React 19, TypeScript 5.8, Tailwind CSS v4"
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  color: '#10b981',
                                  fontSize: '8.5px',
                                  fontWeight: 700,
                                  padding: '3px 6px',
                                  outline: 'none'
                                }}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Verification Gates</span>
                            <input
                              type="text"
                              value={inputs.verification_gates || ''}
                              onChange={(e) => handleUpdateMissionField(selectedMission, ['inputs', 'verification_gates'], e.target.value)}
                              placeholder="QA Unit Tests, Lint Validation, Build Synthesis"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border-soft)',
                                borderRadius: '4px',
                                color: 'var(--text-secondary)',
                                fontSize: '8.5px',
                                padding: '3px 6px',
                                outline: 'none'
                              }}
                            />
                          </div>
                        </div>
                      )}

                      {category === 'standard' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ fontSize: '8.5px', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                            Standard mission goals and execution task backlog:
                          </div>
                          {selectedMission.goals && Object.keys(selectedMission.goals).length > 0 && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                              <span style={{ fontSize: '7.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Active Strategic Goals</span>
                              {Object.entries(selectedMission.goals).map(([gk, gval]: any) => (
                                <div key={gk} style={{ background: 'var(--surface)', padding: '3px 6px', borderRadius: '4px', border: '1px solid var(--border-soft)', fontSize: '8px', color: 'var(--text)' }}>
                                  🎯 {gval.label || gval.goal || gk}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* ================= LINKED EXTRA SOURCES / PRIOR OUTPUTS IN MISSION CONTROL ================= */}
                      <div style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(139, 92, 246, 0.2)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '8px', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            🔗 Linked Extra Sources & Prior Outputs
                          </span>
                          <span style={{ fontSize: '7px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '1px 5px', borderRadius: '3px', fontWeight: 800 }}>
                            STRICT PIPELINE ENFORCEMENT
                          </span>
                        </div>

                        {(() => {
                          const linkedList: string[] = inputs.selected_extra_sources || (inputs.extra_sources ? String(inputs.extra_sources).split('|').map(s => s.trim()).filter(Boolean) : []);
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {linkedList.length === 0 ? (
                                <div style={{ fontSize: '8px', color: 'var(--muted)', fontStyle: 'italic', background: 'var(--surface)', padding: '4px 6px', borderRadius: '4px' }}>
                                  No prior outputs attached. Select from stored Analytics, DeepResearch, or Brainstorming outputs below to strictly enforce in pipeline.
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {linkedList.map(srcId => {
                                    const matchingObj = getAvailableExtraSources().find(x => x.id === srcId);
                                    let catBadgeColor = '#3b82f6';
                                    let catIcon = '📊';
                                    if (matchingObj?.category === 'deep_research') { catBadgeColor = '#ef4444'; catIcon = '🔬'; }
                                    else if (matchingObj?.category === 'brainstorming') { catBadgeColor = '#ec4899'; catIcon = '💡'; }
                                    else if (matchingObj?.category?.startsWith('system_')) { catBadgeColor = '#10b981'; catIcon = '⚙️'; }

                                    return (
                                      <div
                                        key={srcId}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '6px',
                                          background: 'rgba(139, 92, 246, 0.12)',
                                          border: '1px solid rgba(139, 92, 246, 0.3)',
                                          padding: '3px 6px',
                                          borderRadius: '5px',
                                          fontSize: '8px'
                                        }}
                                      >
                                        <span>{catIcon}</span>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                          <span style={{ fontWeight: 800, color: '#8b5cf6' }}>
                                            {matchingObj ? matchingObj.title : srcId}
                                          </span>
                                          {matchingObj && (
                                            <span style={{ fontSize: '7px', color: 'var(--muted)' }}>
                                              Status: <strong style={{ color: catBadgeColor }}>{matchingObj.status?.toUpperCase()}</strong>
                                            </span>
                                          )}
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => setInspectingSourceOutput(matchingObj || { id: srcId, title: srcId, category: 'custom', summary: 'Custom user injected Extra Source path/URI.' })}
                                          style={{
                                            background: 'rgba(139, 92, 246, 0.2)',
                                            border: '1px solid rgba(139, 92, 246, 0.4)',
                                            color: '#8b5cf6',
                                            fontSize: '7.5px',
                                            fontWeight: 800,
                                            padding: '1px 5px',
                                            borderRadius: '3px',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          👁️ Inspect Output
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const nextList = linkedList.filter(id => id !== srcId);
                                            handleUpdateMissionField(selectedMission, ['inputs', 'selected_extra_sources'], nextList);
                                            handleUpdateMissionField(selectedMission, ['inputs', 'extra_sources'], nextList.join(' | '));
                                          }}
                                          style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#ef4444',
                                            fontSize: '8px',
                                            cursor: 'pointer',
                                            padding: '0 2px'
                                          }}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Dropdown / Quick Selector to Attach More Stored Outputs */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                <select
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && !linkedList.includes(val)) {
                                      const nextList = [...linkedList, val];
                                      handleUpdateMissionField(selectedMission, ['inputs', 'selected_extra_sources'], nextList);
                                      handleUpdateMissionField(selectedMission, ['inputs', 'extra_sources'], nextList.join(' | '));
                                    }
                                    e.target.value = '';
                                  }}
                                  defaultValue=""
                                  style={{
                                    flex: 1,
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border-soft)',
                                    borderRadius: '4px',
                                    color: 'var(--text)',
                                    fontSize: '8px',
                                    padding: '3px 6px'
                                  }}
                                >
                                  <option value="" disabled>＋ Attach Stored Analytics, Research, or Brainstorm Output...</option>
                                  {getAvailableExtraSources().map(s => (
                                    <option key={s.id} value={s.id} disabled={linkedList.includes(s.id)}>
                                      [{getCategoryLabel(s.category).toUpperCase()}] {s.title} ({s.id})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })()}

                {/* 5. PHASE ACTION TRIGGER ENGINE */}
                {(() => {
                  const category = selectedMission.type || selectedMission.category || 'standard';
                  return (
                    <div style={{
                      background: 'var(--surface-alt)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                        ⚡ Phase Action Trigger Engine
                      </span>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {category === 'analytics' && (
                          <>
                            <button
                              onClick={() => {
                                handleUpdateMissionStatus(selectedMission, 'execution');
                                setToast({ message: '📊 Executing Analytics Query Engine on ecom_orders_2026.csv...', type: 'info', isOpen: true });
                              }}
                              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              📊 Run Analytics Engine & Build Charts
                            </button>
                            <button
                              onClick={() => setToast({ message: '🔍 Ingesting SQL analytics payload into Fabrica DB...', type: 'info', isOpen: true })}
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '5px', padding: '6px 10px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              🔍 Ingest SQL Payload
                            </button>
                          </>
                        )}

                        {category === 'deep_research' && (
                          <>
                            <button
                              onClick={() => {
                                handleUpdateMissionStatus(selectedMission, 'execution');
                                setToast({ message: '🔬 Initiating Grounded Web Research Crawl on target domains...', type: 'info', isOpen: true });
                              }}
                              style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              🔬 Execute Grounded Web Crawl
                            </button>
                            <button
                              onClick={() => setToast({ message: '📄 Synthesizing Intelligence Dossier with citations...', type: 'info', isOpen: true })}
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '5px', padding: '6px 10px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              📄 Synthesize Dossier
                            </button>
                          </>
                        )}

                        {category === 'brainstorming' && (
                          <>
                            <button
                              onClick={() => {
                                handleUpdateMissionStatus(selectedMission, 'execution');
                                setToast({ message: '🧠 Triggering Brainstorming Matrix Expansion Engine...', type: 'info', isOpen: true });
                              }}
                              style={{ background: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              🧠 Trigger Brainstorming Engine
                            </button>
                            <button
                              onClick={() => setToast({ message: '🌿 Expanding Innovation Concept Nodes...', type: 'info', isOpen: true })}
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '5px', padding: '6px 10px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              🌿 Expand Concept Tree
                            </button>
                          </>
                        )}

                        {category.startsWith('system_') && (
                          <>
                            <button
                              onClick={() => {
                                handleUpdateMissionStatus(selectedMission, 'execution');
                                setToast({ message: '🚀 Executing Pipeline Stage Build & Test Run...', type: 'info', isOpen: true });
                              }}
                              style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              🚀 Trigger Pipeline Stage Execution
                            </button>
                            <button
                              onClick={() => setToast({ message: '🧪 Running Automated Verification Suite on target code...', type: 'info', isOpen: true })}
                              style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '5px', padding: '6px 10px', fontSize: '9px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              🧪 Run Automated Tests
                            </button>
                          </>
                        )}

                        {category === 'standard' && (
                          <>
                            <button
                              onClick={() => {
                                handleUpdateMissionStatus(selectedMission, 'execution');
                                setToast({ message: '⚡ Dispatching Mission Directive to Fabrica Agent Kernel...', type: 'info', isOpen: true });
                              }}
                              style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: '#fff', border: 'none', borderRadius: '5px', padding: '6px 12px', fontSize: '9px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              ⚡ Dispatch Mission Agent
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* 6. Interactive QA Gating Panel */}
                <div style={{
                  background: selectedMission.phase === 'qa' ? 'rgba(244, 63, 94, 0.04)' : 'var(--surface-alt)',
                  border: selectedMission.phase === 'qa' ? '1.5px solid rgba(244, 63, 94, 0.3)' : '1px solid var(--border-soft)',
                  borderRadius: '8px',
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '13px' }}>🛡️</span>
                      <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', color: selectedMission.phase === 'qa' ? '#f43f5e' : 'var(--text)' }}>
                        Quality Gate Verification Assessment
                      </span>
                    </div>
                    {selectedMission.phase !== 'qa' && (
                      <button
                        className="mini accent"
                        onClick={() => handleUpdateMissionField(selectedMission, ['phase'], 'qa')}
                        style={{ fontSize: '8px', padding: '2px 6px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: '4px' }}
                      >
                        Activate Gate
                      </button>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Select Verification Option:</span>
                    {getQaOptionsForCategory(selectedMission.type || selectedMission.category || 'standard').map((opt) => (
                      <label
                        key={opt}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '9.5px',
                          cursor: 'pointer',
                          padding: '4px 6px',
                          borderRadius: '4px',
                          background: qaUserSelection === opt ? 'rgba(255,255,255,0.03)' : 'transparent',
                          border: '1px solid',
                          borderColor: qaUserSelection === opt ? 'var(--border)' : 'transparent'
                        }}
                      >
                        <input
                          type="radio"
                          name="qa_opt"
                          checked={qaUserSelection === opt}
                          onChange={() => setQaUserSelection(opt)}
                          style={{ cursor: 'pointer' }}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Custom Assessment Feedback:</span>
                    <textarea
                      placeholder="Type custom assessment feedback or gates..."
                      value={qaCustomInput}
                      onChange={(e) => setQaCustomInput(e.target.value)}
                      style={{
                        height: '44px',
                        background: 'var(--surface)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        color: 'var(--text)',
                        fontSize: '9.5px',
                        padding: '4px 6px',
                        resize: 'none',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '9px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={qaResolved}
                        onChange={(e) => setQaResolved(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: 800, color: qaResolved ? 'var(--accent-2)' : 'var(--muted)' }}>
                        ✓ Quality Gate Reconciled
                      </span>
                    </label>

                    <button
                      className="mini accent"
                      onClick={() => handleSaveQaState(selectedMission, qaUserSelection, qaCustomInput, qaResolved)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '9px',
                        fontWeight: 800,
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                        borderRadius: '4px'
                      }}
                    >
                      ✓ Submit Assessment
                    </button>
                  </div>
                </div>

                {/* 3. Base Attribute Controls */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Mission Category / Type</span>
                    <select
                      value={selectedMission.type || selectedMission.category || 'standard'}
                      onChange={(e) => handleUpdateMissionField(selectedMission, ['type'], e.target.value)}
                      style={{
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        color: 'var(--text)',
                        fontSize: '10.5px',
                        padding: '6px',
                        outline: 'none'
                      }}
                    >
                      <option value="standard">Standard</option>
                      <option value="full_pipeline">Full Pipeline</option>
                      <option value="quick_pipeline">Quick Jump</option>
                      <option value="custom_entry_pipeline">Custom Entry</option>
                      <option value="custom_selection_pipeline">Custom Selection</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Priority Level</span>
                    <select
                      value={selectedMission.priority || 'MEDIUM'}
                      onChange={(e) => handleUpdateMissionField(selectedMission, ['priority'], e.target.value)}
                      style={{
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        color: 'var(--text)',
                        fontSize: '10.5px',
                        padding: '6px',
                        outline: 'none'
                      }}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Right Column: Dynamic Output Deliverables & Blueprint Map */}
              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', background: 'var(--surface-alt)', overflowY: 'auto' }}>
                
                {/* DYNAMIC DELIVERABLES & ARTIFACT INSPECTOR */}
                {(() => {
                  const category = selectedMission.type || selectedMission.category || 'standard';
                  const phase = getMissionStatus(selectedMission) || 'planning';

                  return (
                    <div style={{
                      background: 'var(--surface)',
                      border: '1.5px solid var(--border)',
                      borderRadius: '8px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                      boxShadow: 'var(--shadow)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-soft)', paddingBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '13px' }}>📤</span>
                          <span style={{ fontSize: '9.5px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            Mission Deliverables & Artifacts
                          </span>
                        </div>
                        <span style={{
                          fontSize: '7.5px',
                          fontWeight: 800,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          background: phase === 'archive' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: phase === 'archive' ? '#10b981' : '#f59e0b',
                          border: '1px solid currentColor'
                        }}>
                          {phase === 'archive' ? '✅ DELIVERABLE FINALIZED' : '⏳ IN SYNTHESIS'}
                        </span>
                      </div>

                      {/* ANALYTICS DELIVERABLES */}
                      {category === 'analytics' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {/* Stat Grid */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                            <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '6px 8px', borderRadius: '5px' }}>
                              <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Conversion Rate</span>
                              <div style={{ fontSize: '13px', fontWeight: 900, color: '#f59e0b', marginTop: '1px' }}>3.84% <span style={{ fontSize: '8px', color: '#10b981' }}>+18.4%</span></div>
                            </div>
                            <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '6px 8px', borderRadius: '5px' }}>
                              <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Customer Acquisition</span>
                              <div style={{ fontSize: '13px', fontWeight: 900, color: '#0ea5e9', marginTop: '1px' }}>$12.40 <span style={{ fontSize: '8px', color: '#10b981' }}>-14.2%</span></div>
                            </div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '6px 8px', borderRadius: '5px' }}>
                              <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Customer LTV</span>
                              <div style={{ fontSize: '13px', fontWeight: 900, color: '#8b5cf6', marginTop: '1px' }}>$420.00 <span style={{ fontSize: '8px', color: '#10b981' }}>+8.6%</span></div>
                            </div>
                            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '6px 8px', borderRadius: '5px' }}>
                              <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800, textTransform: 'uppercase' }}>Cohort Retention</span>
                              <div style={{ fontSize: '13px', fontWeight: 900, color: '#10b981', marginTop: '1px' }}>72.8% <span style={{ fontSize: '8px', color: '#10b981' }}>+5.1%</span></div>
                            </div>
                          </div>

                          {/* Data Table Preview */}
                          <div>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                              📊 Dataset Sample (ecom_orders_2026.csv)
                            </span>
                            <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', borderRadius: '4px', overflow: 'hidden' }}>
                              <table style={{ width: '100%', fontSize: '8px', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-soft)', color: 'var(--muted)' }}>
                                    <th style={{ padding: '4px 6px' }}>Order ID</th>
                                    <th style={{ padding: '4px 6px' }}>Cohort</th>
                                    <th style={{ padding: '4px 6px' }}>Channel</th>
                                    <th style={{ padding: '4px 6px' }}>Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  <tr style={{ borderBottom: '1px solid var(--border-soft)' }}><td style={{ padding: '3px 6px', fontFamily: 'var(--mono)' }}>ORD-9081</td><td style={{ padding: '3px 6px' }}>2026-Q1</td><td style={{ padding: '3px 6px' }}>Organic Search</td><td style={{ padding: '3px 6px', fontWeight: 700, color: '#10b981' }}>$184.50</td></tr>
                                  <tr style={{ borderBottom: '1px solid var(--border-soft)' }}><td style={{ padding: '3px 6px', fontFamily: 'var(--mono)' }}>ORD-9082</td><td style={{ padding: '3px 6px' }}>2026-Q1</td><td style={{ padding: '3px 6px' }}>Direct Ads</td><td style={{ padding: '3px 6px', fontWeight: 700, color: '#10b981' }}>$92.00</td></tr>
                                  <tr><td style={{ padding: '3px 6px', fontFamily: 'var(--mono)' }}>ORD-9083</td><td style={{ padding: '3px 6px' }}>2026-Q1</td><td style={{ padding: '3px 6px' }}>Referral</td><td style={{ padding: '3px 6px', fontWeight: 700, color: '#10b981' }}>$310.00</td></tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* SQL Query Snippet */}
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>💾 Generated SQL Query</span>
                              <button
                                onClick={() => setToast({ message: 'Copied SQL Analytics snippet to clipboard!', type: 'success', isOpen: true })}
                                style={{ background: 'transparent', border: 'none', color: 'var(--accent)', fontSize: '7.5px', fontWeight: 800, cursor: 'pointer' }}
                              >
                                📋 Copy SQL
                              </button>
                            </div>
                            <pre style={{
                              background: '#090d16',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              fontSize: '8px',
                              color: '#38bdf8',
                              fontFamily: 'var(--mono)',
                              margin: 0,
                              overflowX: 'auto',
                              border: '1px solid var(--border-soft)'
                            }}>
                              {`SELECT cohort_month, channel, COUNT(id) as total_orders,\n  AVG(order_val) as aov, SUM(order_val) as revenue\nFROM ecom_orders_2026 GROUP BY 1, 2 ORDER BY revenue DESC;`}
                            </pre>
                          </div>
                        </div>
                      )}

                      {/* DEEP RESEARCH DELIVERABLES */}
                      {category === 'deep_research' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.2)', padding: '8px', borderRadius: '5px' }}>
                            <span style={{ fontSize: '7.5px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase' }}>Executive Research Summary</span>
                            <p style={{ margin: '3px 0 0', fontSize: '9px', color: 'var(--text)', lineHeight: 1.35 }}>
                              Comprehensive intelligence crawl confirms market shift toward autonomous agent orchestration frameworks with real-time vector grounding and deterministic execution gates.
                            </p>
                          </div>

                          <div>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                              🔑 Grounded Findings & Citations
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ background: 'var(--surface-alt)', padding: '5px 7px', borderRadius: '4px', border: '1px solid var(--border-soft)', fontSize: '8.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>1. High concurrency agent graphs reduce task latency by 42%.</span>
                                <span style={{ fontSize: '7px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>98% Conf</span>
                              </div>
                              <div style={{ background: 'var(--surface-alt)', padding: '5px 7px', borderRadius: '4px', border: '1px solid var(--border-soft)', fontSize: '8.5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>2. Quality Gate verifications prevent downstream cascade bugs.</span>
                                <span style={{ fontSize: '7px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>95% Conf</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '3px' }}>
                              🌐 Source Bibliography
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '8px', color: 'var(--accent)', fontFamily: 'var(--mono)' }}>
                              <div>• https://arxiv.org/abs/2602.agent-swarms-2026</div>
                              <div>• https://tech-briefs.org/ai-workflow-orchestration</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* BRAINSTORMING DELIVERABLES */}
                      {category === 'brainstorming' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                            💡 2x2 Impact Matrix & Idea Concepts
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
                            <div style={{ background: 'rgba(236, 72, 153, 0.1)', border: '1px solid rgba(236, 72, 153, 0.3)', padding: '6px', borderRadius: '5px' }}>
                              <span style={{ fontSize: '7px', fontWeight: 900, color: '#ec4899' }}>HIGH IMPACT / FEASIBLE</span>
                              <div style={{ fontSize: '8.5px', fontWeight: 700, marginTop: '2px', color: 'var(--text-bright)' }}>Self-Healing Workflow Agents</div>
                            </div>
                            <div style={{ background: 'rgba(14, 165, 233, 0.08)', border: '1px solid rgba(14, 165, 233, 0.2)', padding: '6px', borderRadius: '5px' }}>
                              <span style={{ fontSize: '7px', fontWeight: 900, color: '#0ea5e9' }}>HIGH IMPACT / EXPIRATIONAL</span>
                              <div style={{ fontSize: '8.5px', fontWeight: 700, marginTop: '2px', color: 'var(--text-bright)' }}>Quantum Agent Swarm Sync</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingTop: '4px' }}>
                            {['Concept A: Auto-Triage Engine', 'Concept B: Visual Flow Composer', 'Concept C: Fabrica Data Mesh'].map((concept, i) => (
                              <button
                                key={concept}
                                onClick={() => setToast({ message: `Selected ${concept} for execution plan!`, type: 'success', isOpen: true })}
                                style={{
                                  background: 'var(--surface-alt)',
                                  border: '1px solid var(--border-soft)',
                                  borderRadius: '4px',
                                  padding: '4px 8px',
                                  fontSize: '8px',
                                  color: 'var(--text)',
                                  whiteSpace: 'nowrap',
                                  cursor: 'pointer'
                                }}
                              >
                                🌿 {concept}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SYSTEM BUILD / PIPELINE DELIVERABLES */}
                      {category.startsWith('system_') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                              ⚙️ Generated Architecture & Code Spec
                            </span>
                            <span style={{ fontSize: '7px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '1px 4px', borderRadius: '3px', fontWeight: 800 }}>
                              100% Tests Passed
                            </span>
                          </div>
                          <pre style={{
                            background: '#090d16',
                            padding: '6px 8px',
                            borderRadius: '4px',
                            fontSize: '8px',
                            color: '#10b981',
                            fontFamily: 'var(--mono)',
                            margin: 0,
                            overflowX: 'auto',
                            border: '1px solid var(--border-soft)',
                            maxHeight: '80px'
                          }}>
                            {`// Fabrica Pipeline Component Stage Output\nexport function SystemPipelineStage(inputs: PipelineInputs) {\n  const res = executeStepValidation(inputs);\n  return { status: "SUCCESS", payload: res };\n}`}
                          </pre>
                        </div>
                      )}

                      {/* STANDARD DELIVERABLES */}
                      {category === 'standard' && (
                        <div style={{ fontSize: '8.5px', color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                          Directive artifact bundle compiled. All action steps validated against mission acceptance criteria.
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Kanban Lane Switcher */}
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    📋 Kanban Lane Status
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '4px' }}>
                    {[
                      { key: 'drafting', label: '📝 Drafting' },
                      { key: 'planning', label: '📋 Planning' },
                      { key: 'execution', label: '⚡ Execution' },
                      { key: 'archive', label: '🗄️ Archive' }
                    ].map((lane) => {
                      const isActive = getMissionStatus(selectedMission) === lane.key;
                      return (
                        <button
                          key={lane.key}
                          onClick={() => handleUpdateMissionStatus(selectedMission, lane.key)}
                          style={{
                            padding: '6px',
                            borderRadius: '4px',
                            border: '1px solid',
                            borderColor: isActive ? 'var(--accent-2)' : 'var(--border-soft)',
                            background: isActive ? 'var(--surface)' : 'rgba(255,255,255,0.02)',
                            color: isActive ? 'var(--accent-2)' : 'var(--muted)',
                            fontSize: '9.5px',
                            fontWeight: isActive ? 800 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.15s'
                          }}
                        >
                          {lane.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Edit Objective Text */}
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>
                    Objective Statement
                  </span>
                  <textarea
                    value={selectedMission.objective || ''}
                    onChange={(e) => handleUpdateMissionField(selectedMission, ['objective'], e.target.value)}
                    placeholder="Enter objective statement..."
                    style={{
                      width: '100%',
                      height: '56px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '4px',
                      color: 'var(--text)',
                      fontSize: '10px',
                      padding: '6px 8px',
                      resize: 'none',
                      outline: 'none',
                      lineHeight: 1.4
                    }}
                  />
                </div>

                {/* ================= RICH INTERACTIVE FABRICA CONTEXT & SYSTEM LINEAGE MAP ================= */}
                <div style={{
                  background: 'rgba(0, 0, 0, 0.22)',
                  border: '1.5px dashed var(--border-soft)',
                  borderRadius: '10px',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {/* Explanatory Concept Banner */}
                  <div style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 51, 234, 0.04) 100%)',
                    border: '1px solid rgba(59, 130, 246, 0.18)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    fontSize: '9.5px',
                    lineHeight: 1.45
                  }}>
                    <div style={{ fontWeight: 800, color: 'var(--accent-2)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                      <span>💡</span> {dtxt.lineageLogicTitle || 'FABRICA SOURCES & DELIVERIES LOGIC'}
                    </div>
                    <p style={{ margin: 0, color: 'var(--text)', fontSize: '9px' }}>
                      {dtxt.rawDataExplain || '📥 Sources: Structured & unstructured context assets (Discovery & Scoping, Deep Research, Data Analysis, Strategic Synthesis).'}
                    </p>
                    <p style={{ margin: '4px 0 0', color: 'var(--text)', fontSize: '9px' }}>
                      {dtxt.systemCompExplain || '📦 Deliveries: Executable codebases, database schemas, automations, and review gates (Executions, Reviews, Completed).'}
                    </p>
                  </div>

                  {/* Header and Controls */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '9.5px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                      🗺️ Blueprint Lineage Map
                    </span>
                    <button
                      onClick={() => setShowAllEcomPortfolio(!showAllEcomPortfolio)}
                      style={{
                        background: 'transparent',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '4px',
                        color: showAllEcomPortfolio ? 'var(--accent)' : 'var(--muted)',
                        fontSize: '8px',
                        fontWeight: 800,
                        padding: '2px 6px',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      {showAllEcomPortfolio ? '👁️ Showing Portfolio' : '🔗 Filtered to Mission'}
                    </button>
                  </div>

                  {/* List of Lineage Assets */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {ecomDataItems
                      .filter(item => showAllEcomPortfolio || item.linkedMissionId === selectedMission.id)
                      .map((item) => {
                        const isLinked = item.linkedMissionId === selectedMission.id;
                        
                        // Compute dynamic highlight colors based on status
                        let statusBg = 'rgba(255, 255, 255, 0.05)';
                        let statusColor = 'var(--text)';
                        let statusText = 'Unknown';
                        let isPulse = false;

                        if (item.status === 'processed') {
                          statusBg = 'rgba(16, 185, 129, 0.12)';
                          statusColor = '#10b981';
                          statusText = 'Already Processed';
                        } else if (item.status === 'new') {
                          statusBg = 'rgba(14, 165, 233, 0.12)';
                          statusColor = '#0ea5e9';
                          statusText = 'New Asset';
                        } else if (item.status === 'in_process') {
                          statusBg = 'rgba(245, 158, 11, 0.12)';
                          statusColor = '#f59e0b';
                          statusText = `In-Process (${String(getMissionStatus(selectedMission) || '').toUpperCase()})`;
                          isPulse = true;
                        } else if (item.status === 'built_new') {
                          statusBg = 'rgba(20, 184, 166, 0.15)';
                          statusColor = '#14b8a6';
                          statusText = 'New System (Built)';
                        } else if (item.status === 'enhanced') {
                          statusBg = 'rgba(139, 92, 246, 0.15)';
                          statusColor = '#8b5cf6';
                          statusText = 'Enhanced System (Active)';
                        }

                        return (
                          <div
                            key={item.id}
                            style={{
                              background: isLinked ? 'var(--surface)' : 'rgba(255,255,255,0.01)',
                              border: isLinked ? '1px solid var(--border)' : '1px solid var(--border-soft)',
                              borderRadius: '6px',
                              padding: '8px 10px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px',
                              position: 'relative',
                              transition: 'all 0.2s',
                              boxShadow: isLinked ? '0 2px 8px rgba(0,0,0,0.2)' : 'none'
                            }}
                          >
                            {/* Title row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ fontSize: '11px' }}>{item.type === 'raw_data' ? '📁' : '⚙️'}</span>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontSize: '9.5px', fontWeight: 800, color: 'var(--text-bright)' }}>{item.name}</span>
                                  <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{item.example}</span>
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {/* Dynamic Status Pill */}
                                <span style={{
                                  fontSize: '7px',
                                  fontWeight: 900,
                                  textTransform: 'uppercase',
                                  background: statusBg,
                                  color: statusColor,
                                  padding: '1.5px 5.5px',
                                  borderRadius: '3px',
                                  letterSpacing: '0.02em',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  animation: isPulse ? 'pulse 1.8s infinite' : 'none'
                                }}>
                                  {isPulse && <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: statusColor }}></span>}
                                  {statusText}
                                </span>
                                {/* Mission Link Toggle */}
                                <button
                                  onClick={() => handleLinkAssetToMission(item, isLinked ? '' : selectedMission.id)}
                                  style={{
                                    background: isLinked ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                                    border: '1px solid',
                                    borderColor: isLinked ? '#10b981' : 'var(--border-soft)',
                                    color: isLinked ? '#10b981' : 'var(--muted)',
                                    borderRadius: '3px',
                                    fontSize: '8px',
                                    padding: '2px 4px',
                                    cursor: 'pointer'
                                  }}
                                  title={isLinked ? 'Unlink from Mission' : 'Link to Mission'}
                                >
                                  {isLinked ? '🔗 Linked' : '➕ Link'}
                                </button>
                              </div>
                            </div>

                            {/* Description text */}
                            <p style={{ margin: 0, fontSize: '8.5px', color: 'var(--text)', lineHeight: 1.35 }}>
                              {item.desc}
                            </p>

                            {/* Status Cycler Controls */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span style={{ fontSize: '7.5px', color: 'var(--muted)', fontWeight: 800 }}>Set Status:</span>
                              {(item.type === 'raw_data' ? ['new', 'in_process', 'processed'] : ['new', 'in_process', 'built_new', 'enhanced']).map(st => {
                                const isCurrent = item.status === st;
                                return (
                                  <button
                                    key={st}
                                    onClick={() => {
                                      if (item.type === 'raw_data') {
                                        const realItem = rawDataList.find((rd: any) => rd.id === item.dbId);
                                        if (realItem) {
                                          handleUpdateRawDataStatus(realItem, st);
                                        }
                                      } else {
                                        const realItem = systemComponents.find((sc: any) => sc.id === item.dbId);
                                        if (realItem) {
                                          handleUpdateSystemComponentStatus(realItem, st);
                                        }
                                      }
                                    }}
                                    style={{
                                      fontSize: '7px',
                                      padding: '1px 4px',
                                      borderRadius: '2.5px',
                                      border: 'none',
                                      cursor: 'pointer',
                                      background: isCurrent ? 'var(--text-bright)' : 'rgba(255,255,255,0.03)',
                                      color: isCurrent ? 'var(--surface)' : 'var(--muted)',
                                      fontWeight: isCurrent ? 900 : 500,
                                      textTransform: 'uppercase'
                                    }}
                                  >
                                    {st === 'built_new' ? 'built' : st === 'processed' ? 'processed' : st}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Enhanced System Legacy Reference Section */}
                            {item.status === 'enhanced' && item.legacyRef && (
                              <div style={{
                                marginTop: '4px',
                                borderTop: '1px solid var(--border-soft)',
                                paddingTop: '6px'
                              }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '7.5px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span>⚠️</span> Legacy reference v1.0 kept for review
                                  </span>
                                  <button
                                    onClick={() => setCompareCodeId(compareCodeId === item.id ? null : item.id)}
                                    style={{
                                      background: 'var(--surface-alt)',
                                      border: '1px solid rgba(139, 92, 246, 0.3)',
                                      borderRadius: '3px',
                                      color: '#8b5cf6',
                                      fontSize: '7.5px',
                                      fontWeight: 800,
                                      padding: '1.5px 5px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    {compareCodeId === item.id ? 'Hide Comparison ✕' : '👁️ Compare with Previous Version'}
                                  </button>
                                </div>

                                {compareCodeId === item.id && (
                                  <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '6px',
                                    background: '#090d16',
                                    padding: '6px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-soft)'
                                  }}>
                                    <div>
                                      <div style={{ fontSize: '7px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--sans)' }}>
                                        <span>🗑️ Previous Version</span>
                                        <span style={{ color: '#ef4444' }}>[BEFORE]</span>
                                      </div>
                                      <pre style={{
                                        margin: 0,
                                        padding: '4px',
                                        fontSize: '7px',
                                        fontFamily: 'var(--mono)',
                                        color: '#ef4444',
                                        background: 'rgba(239, 68, 68, 0.03)',
                                        borderRadius: '3px',
                                        overflowX: 'auto',
                                        lineHeight: 1.3
                                      }}>
                                        {item.legacyRef.code}
                                      </pre>
                                    </div>
                                    <div>
                                      <div style={{ fontSize: '7px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', marginBottom: '3px', display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--sans)' }}>
                                        <span>🚀 Built Version</span>
                                        <span style={{ color: '#10b981' }}>[AFTER]</span>
                                      </div>
                                      <pre style={{
                                        margin: 0,
                                        padding: '4px',
                                        fontSize: '7px',
                                        fontFamily: 'var(--mono)',
                                        color: '#10b981',
                                        background: 'rgba(16, 185, 129, 0.03)',
                                        borderRadius: '3px',
                                        overflowX: 'auto',
                                        lineHeight: 1.3
                                      }}>
                                        {item.legacyRef.enhancedCode}
                                      </pre>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    {ecomDataItems.filter(item => showAllEcomPortfolio || item.linkedMissionId === selectedMission.id).length === 0 && (
                      <div style={{ padding: '16px', textAlign: 'center', color: 'var(--muted)', fontSize: '8.5px', border: '1px dashed var(--border-soft)', borderRadius: '6px' }}>
                        No items linked to this mission. Turn on 'Show Portfolio' to view other assets.
                      </div>
                    )}
                  </div>

                  {/* Inline Form to Ingest/Register New Fabrica Asset */}
                  <div style={{ borderTop: '1px solid var(--border-soft)', paddingTop: '8px' }}>
                    {!isAddingEcomItem ? (
                      <button
                        onClick={() => setIsAddingEcomItem(true)}
                        style={{
                          width: '100%',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px dashed var(--border-soft)',
                          borderRadius: '4px',
                          color: 'var(--accent)',
                          padding: '5px',
                          fontSize: '8.5px',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px'
                        }}
                      >
                        ➕ Ingest Source Asset / Register Delivery
                      </button>
                    ) : (
                      <div style={{
                        background: 'var(--surface-alt)',
                        border: '1px solid var(--border-soft)',
                        borderRadius: '6px',
                        padding: '10px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '8px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase' }}>
                            Add Portfolio Asset
                          </span>
                          <button
                            onClick={() => setIsAddingEcomItem(false)}
                            style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '9px' }}
                          >
                            ✕
                          </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '4px' }}>
                          <input
                            type="text"
                            placeholder="Asset Name (e.g., ad_spent.json)"
                            value={ecomNewName}
                            onChange={(e) => setEcomNewName(e.target.value)}
                            style={{ padding: '4px', fontSize: '8.5px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text)' }}
                          />
                          <select
                            value={ecomNewType}
                            onChange={(e) => {
                              const t = e.target.value as any;
                              setEcomNewType(t);
                              setEcomNewStatus(t === 'raw_data' ? 'new' : 'built_new');
                            }}
                            style={{ padding: '4px', fontSize: '8.5px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text)' }}
                          >
                            <option value="raw_data">📥 Source Asset</option>
                            <option value="system">📦 Delivery Artifact</option>
                          </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                          <input
                            type="text"
                            placeholder="Format/File/Repo Name"
                            value={ecomNewExample}
                            onChange={(e) => setEcomNewExample(e.target.value)}
                            style={{ padding: '4px', fontSize: '8.5px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text)' }}
                          />
                          <select
                            value={ecomNewStatus}
                            onChange={(e) => setEcomNewStatus(e.target.value)}
                            style={{ padding: '4px', fontSize: '8.5px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text)' }}
                          >
                            {ecomNewType === 'raw_data' ? (
                              <>
                                <option value="new">New</option>
                                <option value="in_process">In-Process</option>
                                <option value="processed">Processed</option>
                              </>
                            ) : (
                              <>
                                <option value="new">New Specification</option>
                                <option value="in_process">In-Process</option>
                                <option value="built_new">Built (New)</option>
                                <option value="enhanced">Enhanced (Active v2.0)</option>
                              </>
                            )}
                          </select>
                        </div>

                        <textarea
                          placeholder="Business description of asset..."
                          value={ecomNewDesc}
                          onChange={(e) => setEcomNewDesc(e.target.value)}
                          style={{ height: '30px', padding: '4px', fontSize: '8.5px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text)', resize: 'none' }}
                        />

                        {ecomNewType === 'system' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8px', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={ecomNewHasLegacy}
                                onChange={(e) => setEcomNewHasLegacy(e.target.checked)}
                              />
                              <span>Has legacy reference code (v1.0) to preserve?</span>
                            </label>

                            {ecomNewHasLegacy && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px' }}>
                                <textarea
                                  placeholder="Legacy v1.0 code..."
                                  value={ecomNewLegacyCode}
                                  onChange={(e) => setEcomNewLegacyCode(e.target.value)}
                                  style={{ height: '35px', padding: '4px', fontSize: '7.5px', fontFamily: 'var(--mono)', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text)', resize: 'none' }}
                                />
                                <textarea
                                  placeholder="Enhanced v2.0 code..."
                                  value={ecomNewEnhancedCode}
                                  onChange={(e) => setEcomNewEnhancedCode(e.target.value)}
                                  style={{ height: '35px', padding: '4px', fontSize: '7.5px', fontFamily: 'var(--mono)', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: '3px', color: 'var(--text)', resize: 'none' }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <button
                          onClick={() => {
                            if (!ecomNewName) {
                              setToast({
                                message: 'Please enter a valid asset name.',
                                type: 'error',
                                isOpen: true
                              });
                              return;
                            }
                            const newItem: any = {
                              id: `custom_asset_${Date.now()}`,
                              name: ecomNewName,
                              type: ecomNewType,
                              example: ecomNewExample || (ecomNewType === 'raw_data' ? 'data_source.csv' : 'repository_tree'),
                              desc: ecomNewDesc || 'No details provided.',
                              status: ecomNewStatus,
                              linkedMissionId: selectedMission.id
                            };

                            if (ecomNewType === 'system' && ecomNewHasLegacy) {
                              newItem.legacyRef = {
                                version: 'v1.0 (Legacy)',
                                date: new Date().toISOString().slice(0, 10),
                                code: ecomNewLegacyCode || '// original legacy code',
                                enhancedCode: ecomNewEnhancedCode || '// enhanced version code'
                              };
                            }

                            setEcomDataItems([...ecomDataItems, newItem]);
                            setIsAddingEcomItem(false);

                            // Reset form fields
                            setEcomNewName('');
                            setEcomNewExample('');
                            setEcomNewDesc('');
                            setEcomNewHasLegacy(false);
                            setEcomNewLegacyCode('');
                            setEcomNewEnhancedCode('');

                            setToast({
                              message: 'Successfully ingested asset into Fabrica Lineage map!',
                              type: 'success',
                              isOpen: true
                            });
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none',
                            borderRadius: '3px',
                            color: '#fff',
                            padding: '4px 8px',
                            fontSize: '8.5px',
                            fontWeight: 800,
                            cursor: 'pointer'
                          }}
                        >
                          ✓ Save Asset & Link to Active Mission
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Timeline History */}
                <div>
                  <span style={{ fontSize: '9px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                    📜 Pipeline Execution History
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '110px', overflowY: 'auto', paddingRight: '2px' }}>
                    {(selectedMission.workflow_history || []).map((h: any, idx: number) => (
                      <div key={idx} style={{
                        background: 'var(--surface)',
                        borderInlineStart: '2px solid var(--accent-2)',
                        padding: '6px 8px',
                        borderRadius: uiLang === 'AR' ? '4px 0 0 4px' : '0 4px 4px 0',
                        fontSize: '8.5px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted)', marginBottom: '2px', fontFamily: 'var(--mono)' }}>
                          <span>Phase: {h.phase}</span>
                          <span>{new Date(h.timestamp).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text)', lineHeight: 1.3 }}>{h.status}</p>
                      </div>
                    ))}
                    {(!selectedMission.workflow_history || selectedMission.workflow_history.length === 0) && (
                      <div style={{ fontSize: '8.5px', color: 'var(--muted)', textAlign: 'center', padding: '10px', border: '1px dashed var(--border-soft)', borderRadius: '4px' }}>
                        No workflow history recorded yet.
                      </div>
                    )}
                  </div>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              padding: '12px 20px',
              borderTop: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <button
                onClick={() => setSelectedMission(null)}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#fff',
                  fontSize: '9.5px',
                  fontWeight: 800,
                  padding: '6px 16px',
                  cursor: 'pointer'
                }}
              >
                Close Control Panel
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ================= EXTRA SOURCE / STORED OUTPUT INSPECTION MODAL ================= */}
      {inspectingSourceOutput && (
        <div
          className="dashboard-modal-overlay"
          style={{
            background: 'rgba(9, 13, 22, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div style={{
            width: 'min(36rem, 95vw)',
            background: 'var(--surface)',
            border: '2px solid #8b5cf6',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(139, 92, 246, 0.3), var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '85vh'
          }}>
            {/* Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderBottom: '1.5px solid rgba(139, 92, 246, 0.3)',
              background: 'rgba(139, 92, 246, 0.08)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>👁️</span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '11px', fontWeight: 900, color: '#8b5cf6', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Stored Output Inspector
                  </span>
                  <span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-bright)' }}>
                    {inspectingSourceOutput.title || inspectingSourceOutput.id}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setInspectingSourceOutput(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                ✕
              </button>
            </div>

            {/* Content Body */}
            <div style={{ padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Meta Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '8px', background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  CATEGORY: {getCategoryLabel(inspectingSourceOutput.category || 'analytics').toUpperCase()}
                </span>
                <span style={{ fontSize: '8px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', padding: '2px 6px', borderRadius: '4px', fontWeight: 800, fontFamily: 'var(--mono)' }}>
                  ID: {inspectingSourceOutput.id}
                </span>
                <span style={{ fontSize: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                  STATUS: {(inspectingSourceOutput.status || 'done').toUpperCase()}
                </span>
              </div>

              {/* Summary & Findings */}
              <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--border-soft)', padding: '10px 12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                  📊 Synthesized Output Summary & Metrics
                </span>
                <p style={{ margin: 0, fontSize: '9.5px', color: 'var(--text)', lineHeight: 1.45 }}>
                  {inspectingSourceOutput.summary || inspectingSourceOutput.data?.key_findings || 'Stored analytics and deep research outputs injected into pipeline memory.'}
                </p>
              </div>

              {/* Full Details Object Breakdown */}
              {inspectingSourceOutput.data && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ fontSize: '8px', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                    ⚙️ Data Record Payload
                  </span>
                  <pre style={{
                    background: '#090d16',
                    padding: '8px',
                    borderRadius: '6px',
                    fontSize: '8px',
                    color: '#8b5cf6',
                    fontFamily: 'var(--mono)',
                    margin: 0,
                    overflowX: 'auto',
                    border: '1px solid var(--border-soft)',
                    maxHeight: '120px'
                  }}>
                    {JSON.stringify(inspectingSourceOutput.data, null, 2)}
                  </pre>
                </div>
              )}

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', padding: '8px 10px', borderRadius: '6px', fontSize: '8.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>✓</span>
                <span>This output is strictly linked to the pipeline execution context. All steps will reference its stored findings.</span>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '10px 18px', borderTop: '1px solid var(--border-soft)', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setInspectingSourceOutput(null)}
                style={{
                  background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                  border: 'none',
                  borderRadius: '5px',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '5px 14px',
                  cursor: 'pointer'
                }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW PROJECT MODAL */}
      {isCreatingProjectModal && (
        <div
          className="dashboard-modal-overlay"
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
        >
          <div style={{
            width: '100%',
            maxWidth: '460px',
            background: 'var(--surface)',
            border: '1.5px solid var(--accent)',
            borderRadius: '12px',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), var(--shadow)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-soft)',
              background: 'var(--surface-alt)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '16px' }}>📁</span>
                <span style={{ fontSize: '12px', fontWeight: 900, color: 'var(--text-bright)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Create New Project Workspace
                </span>
              </div>
              <button
                onClick={() => setIsCreatingProjectModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--muted)', fontSize: '14px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: 0, fontSize: '10px', color: 'var(--text-soft)', lineHeight: 1.5 }}>
                Creating a project provisions dedicated <code style={{ fontFamily: 'var(--mono)' }}>sources/</code> and <code style={{ fontFamily: 'var(--mono)' }}>deliverables/</code> workspace context.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '9px', fontWeight: 800, color: 'var(--text-bright)', textTransform: 'uppercase' }}>
                  Project Name / Identifier:
                </label>
                <input
                  type="text"
                  placeholder="e.g. market_intelligence, supply_chain_v2"
                  value={newProjectNameInput}
                  onChange={(e) => setNewProjectNameInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNewProject(); }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    background: 'var(--surface-alt)',
                    color: 'var(--text-bright)',
                    fontSize: '11px',
                    fontFamily: 'var(--mono)',
                    outline: 'none'
                  }}
                  autoFocus
                />
              </div>

              <div style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)', padding: '10px 12px', borderRadius: '8px', fontSize: '9.5px', color: '#3b82f6', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '12px' }}>💡</span>
                <span>
                  All uploads and generated AI systems assigned to this project will be isolated within your active workspace.
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '12px 18px', borderTop: '1px solid var(--border-soft)', background: 'var(--surface-alt)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setIsCreatingProjectModal(false)}
                style={{
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--muted)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '6px 14px',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateNewProject}
                disabled={!newProjectNameInput.trim()}
                style={{
                  background: 'var(--accent)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '10px',
                  fontWeight: 800,
                  padding: '6px 16px',
                  cursor: newProjectNameInput.trim() ? 'pointer' : 'not-allowed',
                  opacity: newProjectNameInput.trim() ? 1 : 0.5
                }}
              >
                Create Project Tree
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plan 1.1-B: Context Picker Modal */}
      <ContextPickerModal
        isOpen={isContextPickerOpen}
        onClose={() => setIsContextPickerOpen(false)}
        onAttach={(items) => setContextPickerAttachedItems(prev => [...prev, ...items])}
        missions={missions}
        rawDataList={rawDataList}
        systemComponents={systemComponents}
      />

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marqueeLeftToRight {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0%); }
        }
        .review-marquee {
          animation: marqueeLeftToRight 28s linear infinite;
        }
        .review-marquee:hover {
          animation-play-state: paused !important;
        }
        .backlog-marquee {
          animation: marqueeLeftToRight 28s linear infinite;
        }
        .backlog-marquee:hover {
          animation-play-state: paused !important;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }
        @keyframes thinkingDot {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        @keyframes agentFabActiveGlow {
          0%, 100% { transform: scale(1); box-shadow: 0 0 20px rgba(245, 158, 11, 0.4); }
          50% { transform: scale(1.08); box-shadow: 0 0 35px rgba(245, 158, 11, 0.7); }
        }
        @keyframes slideIn {
          from { transform: translateY(100px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .agent-fab-active-glow {
          animation: agentFabActiveGlow 2s infinite ease-in-out;
        }
        .agent-fab-glow:hover {
          transform: scale(1.05);
          box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
        }
        .thinking-dots span {
          animation: thinkingDot 1.4s infinite ease-in-out;
        }
      ` }} />
    </div>
  );
}
