// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  User,
  Car,
  Bus,
  Bike,
  CheckCircle,
  Gift,
  Heart,
  AlertTriangle,
  Loader2,
  Info,
  Clock,
} from "lucide-react";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// --- TUS CLAVES REALES DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyA0AdwggxIkq3zZgU3vZZx77WEI7mW1qDo",
  authDomain: "tesis-soufyan.firebaseapp.com",
  projectId: "tesis-soufyan",
  storageBucket: "tesis-soufyan.firebasestorage.app",
  messagingSenderId: "735092572222",
  appId: "1:735092572222:web:096787cc9c629e293b516f",
  measurementId: "G-1RZFNMD5W9",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const COLLECTION_NAME = "survey_responses";

// --- CONFIGURACIÓN DE LA MATRIZ ---
const MATRIX_CONTEXTS = [
  { id: "commute", label: "Trabajo / Estudios (Rutina diaria)" },
  { id: "shopping", label: "Compras / Recados / Gestiones" },
  { id: "leisure", label: "Ocio / Social / Deporte" },
  { id: "family", label: "Transporte familiar / Acompañantes" },
  { id: "travel", label: "Viajes largos / Turismo" },
];

const MATRIX_FREQUENCIES = [
  { value: "daily", label: "Diario (5+ días/sem)" },
  { value: "weekly", label: "Frecuente (1-4 días/sem)" },
  { value: "sporadic", label: "Ocasional" },
  { value: "never", label: "Nunca" },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [currentPopup, setCurrentPopup] = useState(0);

  const [user, setUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // --- SOLUCIÓN DE DISEÑO: Inyectar Tailwind CSS ---
  useEffect(() => {
    if (!document.getElementById("tailwind-cdn")) {
      const script = document.createElement("script");
      script.id = "tailwind-cdn";
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // Autenticación Anónima
  useEffect(() => {
    signInAnonymously(auth).catch((error) => {
      console.error("Error Auth:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // --- MENSAJES ACADÉMICOS Y FORMALES ---
  const motivationalMessages = [
    {
      icon: Gift,
      message: "Incentivo a la participación",
      subtitle:
        "Al finalizar el estudio, podrá optar al sorteo de una tarjeta regalo de 50€.",
    },
    {
      icon: Info,
      message: "Relevancia del estudio",
      subtitle:
        "Sus respuestas contribuyen directamente al análisis de la infraestructura urbana de Almería.",
    },
    {
      icon: AlertTriangle,
      message: "Contexto Normativo",
      subtitle:
        "Investigación sobre el impacto de la implementación de Zonas de Bajas Emisiones (ZBE) en 2026.",
    },
    {
      icon: Bike,
      message: "Alternativas Sostenibles",
      subtitle:
        "Evaluación de la viabilidad de nuevos modelos de movilidad compartida.",
    },
    {
      icon: CheckCircle,
      message: "Contribución Académica",
      subtitle:
        "Este estudio forma parte de una tesis de grado para FH Aachen University.",
    },
  ];

  // Pop-ups
  useEffect(() => {
    const popupInterval = setInterval(() => {
      setShowPopup(true);
      setCurrentPopup((prev) => (prev + 1) % motivationalMessages.length);
      setTimeout(() => setShowPopup(false), 8000);
    }, 60000);

    const initialPopup = setTimeout(() => {
      setShowPopup(true);
      setTimeout(() => setShowPopup(false), 8000);
    }, 15000);

    return () => {
      clearInterval(popupInterval);
      clearTimeout(initialPopup);
    };
  }, []);

  const getUserPath = () => {
    const vehicles = answers.vehicles; // Single choice (string)

    // Check if a vehicle is selected (and not 'none')
    const hasAnyVehicle = vehicles && vehicles !== "none";

    const hasCar = vehicles === "car_gas" || vehicles === "car_electric";
    const hasOtherVehicle = [
      "moto_gas",
      "moto_electric",
      "bike",
      "ebike",
      "scooter",
    ].includes(vehicles);
    const hasNoVehicle = vehicles === "none";

    return { hasCar, hasOtherVehicle, hasNoVehicle, hasAnyVehicle };
  };

  const questions = [
    {
      id: "intro",
      type: "intro",
      title: "Estudio Académico sobre Movilidad Urbana en Almería",
      content: `Estimado/a participante,\n\nSoy Soufyan Essoubai Chikh, estudiante de Global Business and Economics. Estoy llevando a cabo una investigación académica para mi tesis de grado, cuyo objetivo es analizar los patrones de movilidad urbana en la provincia de Almería e identificar oportunidades de mejora en la infraestructura de transporte.\n\nLa encuesta es completamente anónima y los datos recopilados serán tratados con estricta confidencialidad y utilizados exclusivamente para fines académicos.\n\nTiempo estimado: 3-5 minutos.\nAgradezco sinceramente su colaboración.`,
    },
    // --- SORTEO AL PRINCIPIO ---
    {
      id: "raffle_participation_intro",
      question: "🎁 ¡Participa en el Sorteo de 50€!",
      subtitle:
        "Para incentivar su participación, sorteamos una tarjeta regalo. Rellene sus datos ahora para asegurar su entrada (Opcional). Su participación se validará al enviar la encuesta.",
      type: "raffle",
      required: false,
    },
    {
      id: "residence",
      question: "Lugar de residencia habitual",
      type: "single",
      icon: MapPin,
      required: true,
      options: [
        { value: "almeria", label: "Almería (capital)" },
        { value: "roquetas", label: "Roquetas de Mar" },
        { value: "ejido", label: "El Ejido" },
        { value: "nijar", label: "Níjar" },
        { value: "vicar", label: "Vícar" },
        {
          value: "other",
          label: "Otro municipio de la provincia",
          hasInput: true,
        },
      ],
    },
    {
      id: "age",
      question: "Rango de edad",
      type: "single",
      icon: User,
      required: true,
      options: [
        { value: "<18", label: "Menor de 18 años" },
        { value: "18-24", label: "18-24 años" },
        { value: "25-34", label: "25-34 años" },
        { value: "35-44", label: "35-44 años" },
        { value: "45-54", label: "45-54 años" },
        { value: "55-64", label: "55-64 años" },
        { value: "65+", label: "65 años o más" },
      ],
    },
    {
      id: "occupation",
      question: "Ocupación principal",
      subtitle: "Seleccione la opción que mejor describa su situación actual",
      type: "single",
      icon: User,
      required: true,
      options: [
        { value: "student_uni", label: "Estudiante universitario" },
        {
          value: "student_hs",
          label: "Estudiante (Secundaria/Bachillerato/FP)",
        },
        { value: "young_prof", label: "Profesional en activo (< 35 años)" },
        { value: "adult_prof", label: "Profesional en activo (≥ 35 años)" },
        { value: "parent", label: "Dedicado/a al cuidado del hogar/familia" },
        { value: "self_employed", label: "Autónomo / Empresario" },
        { value: "retired", label: "Jubilado / Pensionista" },
        { value: "unemployed", label: "En búsqueda de empleo" },
        { value: "other", label: "Otra situación", hasInput: true },
      ],
    },
    {
      id: "travel_reasons",
      question:
        "Motivos principales de uso de su metodo de transporte cotidiano.",
      subtitle: "Seleccione todas las opciones pertinentes",
      type: "multiple",
      required: true,
      options: [
        { value: "work", label: "Desplazamiento al lugar de trabajo" },
        { value: "study", label: "Asistencia a centro educativo" },
        { value: "family", label: "Logística familiar / Acompañamiento" },
        { value: "shopping", label: "Compras y gestiones administrativas" },
        { value: "leisure", label: "Ocio y tiempo libre" },
        { value: "sports", label: "Actividad física / Deporte" },
        { value: "social", label: "Visitas sociales" },
        { value: "medical", label: "Asistencia sanitaria" },
        { value: "other", label: "Otro motivo", hasInput: true },
      ],
    },
    {
      id: "proximity",
      question: "Percepción de cercanía",
      subtitle:
        '¿Qué distancia considera "cercana" para un desplazamiento habitual a pie o en medios no motorizados?',
      type: "single",
      required: true,
      options: [
        { value: "0-500m", label: "Hasta 500 metros" },
        { value: "500m-1km", label: "Entre 500 metros y 1 km" },
        { value: "1-3km", label: "Entre 1 km y 3 km" },
        { value: "3-5km", label: "Entre 3 km y 5 km" },
        { value: "5-10km", label: "Entre 5 km y 10 km" },
        { value: ">10km", label: "Más de 10 km" },
      ],
    },
    {
      id: "vehicles",
      question: "Vehículo principal de uso personal",
      subtitle: "Seleccione el vehículo que utiliza con mayor frecuencia",
      type: "single",
      icon: Car,
      required: true,
      options: [
        { value: "car_gas", label: "Automóvil (Combustión interna)" },
        { value: "car_electric", label: "Automóvil (Híbrido o Eléctrico)" },
        { value: "moto_gas", label: "Motocicleta / Scooter (Combustión)" },
        { value: "moto_electric", label: "Motocicleta / Scooter (Eléctrica)" },
        { value: "bike", label: "Bicicleta convencional" },
        { value: "ebike", label: "Bicicleta eléctrica (e-bike)" },
        {
          value: "scooter",
          label: "Vehículo de Movilidad Personal (Patinete eléc.)",
        },
        { value: "none", label: "Ninguno" },
      ],
    },
    // --- PREGUNTA MATRIZ UNIFICADA (Contexto x Frecuencia) ---
    {
      id: "matrix_usage_frequency",
      question: "Patrones de uso detallados",
      subtitle:
        "Para su vehículo principal, indique con qué frecuencia lo utiliza en cada situación.",
      type: "matrix_context_freq",
      required: true,
      showIf: () => getUserPath().hasAnyVehicle,
    },
    // --- FIN MATRIZ ---

    {
      id: "car_barriers",
      question: "Barreras para el uso de otro metodo de transporte",
      subtitle: "Seleccione hasta 3 factores principales",
      type: "multiple",
      maxSelections: 3,
      required: true,
      showIf: () => getUserPath().hasCar,
      options: [
        {
          value: "pt_coverage",
          label: "Cobertura insuficiente del transporte público",
        },
        { value: "pt_schedule", label: "Frecuencia/Horarios inadecuados" },
        {
          value: "pt_slow",
          label: "Tiempo de viaje excesivo en transporte público",
        },
        {
          value: "no_bike_lanes",
          label: "Infraestructura ciclista insegura o inexistente",
        },
        {
          value: "climate",
          label: "Condiciones climáticas (altas temperaturas)",
        },
        {
          value: "heavy_items",
          label: "Necesidad de transportar carga habitualmente",
        },
        { value: "passengers", label: "Necesidad de transportar acompañantes" },
        {
          value: "autonomy",
          label: "Preferencia por autonomía y flexibilidad",
        },
        { value: "habit", label: "Hábito / Costumbre" },
        { value: "no_alternatives", label: "Desconocimiento de alternativas" },
        { value: "other", label: "Otra razón", hasInput: true },
      ],
    },
    {
      id: "no_car_reason",
      question: "Motivo principal de no tenencia de vehículo",
      type: "single",
      required: true,
      showIf: () => !getUserPath().hasCar && getUserPath().hasOtherVehicle,
      options: [
        {
          value: "cost",
          label: "Factores económicos (Adquisición, mantenimiento)",
        },
        {
          value: "no_need",
          label: "Satisfecho con otras alternativas de movilidad",
        },
        { value: "parking", label: "Dificultad de estacionamiento" },
        { value: "environmental", label: "Conciencia ambiental" },
        { value: "no_license", label: "Ausencia de licencia de conducción" },
        {
          value: "independence",
          label: "Preferencia personal por otros medios",
        },
        { value: "other", label: "Otro motivo", hasInput: true },
      ],
    },
    {
      id: "satisfaction_vehicle",
      question: "Nivel de satisfacción con su metodo de movilidad actual",
      subtitle: "1 = Muy insatisfecho | 5 = Muy satisfecho",
      type: "scale",
      required: true,
      showIf: () => !getUserPath().hasCar && getUserPath().hasOtherVehicle,
      scale: { min: 1, max: 5 },
    },
    {
      id: "no_vehicle_reason",
      question: "Motivo principal de ausencia de vehículo privado",
      type: "single",
      required: true,
      showIf: () => getUserPath().hasNoVehicle,
      options: [
        { value: "cost", label: "Factores económicos" },
        {
          value: "pt_works",
          label: "El transporte público cubre mis necesidades",
        },
        { value: "environmental", label: "Conciencia ambiental" },
        { value: "no_license", label: "Ausencia de licencia de conducción" },
        {
          value: "no_responsibility",
          label: "Preferencia por evitar responsabilidades de propiedad",
        },
        { value: "proximity", label: "Proximidad a servicios esenciales" },
        { value: "other", label: "Otro motivo", hasInput: true },
      ],
    },
    // --- Q13 MODIFICADA ---
    {
      id: "decision_factors",
      question: "Factores determinantes en tu elección de transporte",
      subtitle:
        "Ordene por importancia del 1 (Más importante) al 5 (Menos importante)",
      type: "ranking",
      required: true,
      options: [
        { value: "speed", label: "Eficiencia temporal (Rapidez)" },
        { value: "cost", label: "Coste económico" },
        { value: "comfort", label: "Confort / Comodidad" },
        { value: "flexibility", label: "Flexibilidad horaria y espacial" },
        { value: "sustainability", label: "Sostenibilidad ambiental" },
      ],
    },
    {
      id: "motosharing_intention",
      question: "Intención de uso de servicios de movilidad compartida",
      subtitle:
        "Ante la hipotética implementación de un servicio de movilidad eléctrica compartida en Almería",
      type: "single",
      icon: Bike,
      required: true,
      highlight: true,
      options: [
        { value: "very_likely", label: "Muy probable (Uso frecuente)" },
        { value: "likely", label: "Probable (Uso regular)" },
        { value: "possible", label: "Posible (Uso esporádico/Prueba)" },
        { value: "unlikely", label: "Poco probable" },
        { value: "very_unlikely", label: "Nada probable" },
      ],
    },
    {
      id: "motosharing_features",
      question: "Atributos valorados en el metodo de transporte",
      subtitle: "Seleccione los 3 aspectos más críticos para usted",
      type: "multiple",
      maxSelections: 3,
      required: true,
      showIf: () =>
        ["very_likely", "likely", "possible"].includes(
          answers.motosharing_intention
        ),
      options: [
        { value: "price", label: "Estructura tarifaria competitiva" },
        {
          value: "availability",
          label: "Disponibilidad geográfica (Densidad de flota)",
        },
        { value: "ease", label: "Usabilidad de la plataforma digital (App)" },
        { value: "no_license", label: "Accesibilidad sin licencia específica" },
        { value: "autonomy", label: "Autonomía de los vehículos" },
        { value: "charging", label: "Infraestructura de recarga/aparcamiento" },
        { value: "safety", label: "Seguridad percibida del vehículo" },
        { value: "helmets", label: "Provisión de equipamiento de seguridad" },
        { value: "service", label: "Soporte al usuario" },
        { value: "sustainability", label: "Garantía de energía renovable" },
        { value: "other", label: "Otro atributo", hasInput: true },
      ],
    },
    {
      id: "willingness_to_pay",
      question: "Disposición a pagar",
      subtitle: "Precio máximo estimado por un trayecto estándar de 20 minutos",
      type: "single",
      required: true,
      options: [
        { value: "<2", label: "Menos de 2,00€" },
        { value: "2-3", label: "Entre 2,00€ y 3,00€" },
        { value: "3-4", label: "Entre 3,00€ y 4,00€" },
        { value: "4-5", label: "Entre 4,00€ y 5,00€" },
        { value: ">5", label: "Más de 5,00€" },
        { value: "none", label: "No utilizaría el servicio con coste" },
      ],
    },
    // --- Q17 MODIFICADA ---
    {
      id: "travel_experience",
      question: "¿Como valora su experiencia actual de transporte cotidiana?",
      type: "single",
      required: true,
      options: [
        { value: "pleasant", label: "Muy Positiva / Relajante" },
        { value: "neutral", label: "Neutra / Rutinaria" },
        { value: "stressful", label: "Estresante (Tráfico/Congestión)" },
        { value: "uncomfortable", label: "Incómoda (Clima/Infraestructura)" },
        { value: "boring", label: "Negativa (Pérdida de tiempo)" },
        { value: "varies", label: "Variable según circunstancias" },
      ],
    },
    {
      id: "almeria_problems",
      question: "Diagnóstico del problema en la movilidad en Almería",
      subtitle: "Identifique los 2 problemas más críticos según su criterio",
      type: "multiple",
      maxSelections: 2,
      minSelections: 2,
      required: true,
      options: [
        { value: "traffic", label: "Congestión vehicular" },
        {
          value: "pt_inefficient",
          label: "Ineficiencia del transporte público",
        },
        { value: "bike_infra", label: "Déficit de infraestructura ciclista" },
        { value: "parking", label: "Déficit de plazas de aparcamiento" },
        {
          value: "car_dependency",
          label: "Excesiva dependencia del vehículo privado",
        },
        { value: "pollution", label: "Contaminación acústica y atmosférica" },
        { value: "connections", label: "Desconexión intermunicipal" },
        {
          value: "no_innovation",
          label: "Ausencia de modelos de movilidad innovadores",
        },
        { value: "climate", label: "Condiciones climáticas adversas" },
        { value: "other", label: "Otro problema", hasInput: true },
      ],
    },
    {
      id: "final",
      type: "final",
      title: "Agradecimiento por su colaboración",
      content: `Sus respuestas han sido registradas satisfactoriamente.\n\nLa información proporcionada es de vital importancia para el desarrollo de esta investigación sobre la movilidad urbana en Almería. Los resultados contribuirán a proponer soluciones fundamentadas para la mejora de la calidad de vida de los residentes.\n\nInvestigador principal: Soufyan Essoubai Chikh\nGlobal Business & Economics, FH Aachen University`,
    },
  ];

  const visibleQuestions = questions.filter((q) => !q.showIf || q.showIf());

  const currentQuestion = visibleQuestions[currentStep];
  const progress = ((currentStep + 1) / visibleQuestions.length) * 100;

  const handleAnswer = (value) => {
    setAnswers({ ...answers, [currentQuestion.id]: value });
  };

  const handleOtherInput = (questionId, textValue) => {
    setAnswers((prev) => ({
      ...prev,
      [`${questionId}_other_text`]: textValue,
    }));
  };

  const handleRaffleInput = (field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleMultipleAnswer = (optionValue, maxSelections) => {
    const currentSelected = answers[currentQuestion.id] || [];
    let newSelected;

    if (currentSelected.includes(optionValue)) {
      newSelected = currentSelected.filter((v) => v !== optionValue);
    } else {
      if (maxSelections && currentSelected.length >= maxSelections) {
        return; // No permitir más selecciones
      }
      newSelected = [...currentSelected, optionValue];
    }
    handleAnswer(newSelected);
  };

  const handleRankingAnswer = (optionValue) => {
    const currentSelected = answers[currentQuestion.id] || [];
    if (currentSelected.includes(optionValue)) {
      handleAnswer(currentSelected.filter((v) => v !== optionValue));
    } else {
      handleAnswer([...currentSelected, optionValue]);
    }
  };

  // Manejador simplificado para la matriz (Contexto -> Frecuencia)
  const handleMatrixAnswerSimple = (contextId, frequencyValue) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: {
        ...(prev[currentQuestion.id] || {}),
        [contextId]: frequencyValue,
      },
    }));
  };

  const handleSubmitSurvey = async () => {
    if (!user) {
      setSubmitError("Error de sesión. Por favor recargue la página.");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    // Calcular si es una participación válida para sorteo (si rellenó los datos al inicio)
    const isRaffleParticipant =
      answers.raffle_email && answers.raffle_name && answers.raffle_terms;

    try {
      await addDoc(collection(db, COLLECTION_NAME), {
        userId: user.uid,
        answers: answers,
        raffle_valid: !!isRaffleParticipant,
        submittedAt: serverTimestamp(),
        deviceInfo: {
          userAgent: navigator.userAgent,
          language: navigator.language,
        },
      });

      setIsSubmitting(false);
      setShowResults(true);
    } catch (error) {
      console.error("Error al guardar respuestas:", error);
      setSubmitError(
        "Ha ocurrido un error al procesar sus datos. Por favor, inténtelo de nuevo."
      );
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < visibleQuestions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitSurvey();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    const answer = answers[currentQuestion?.id];
    if (!currentQuestion?.required) return true;

    // Validación Matrix Simple (Debe responder al menos un contexto para proceder, o todos si eres estricto)
    if (currentQuestion.type === "matrix_context_freq") {
      // Opcional: Requerir que responda a todos los contextos?
      // Aquí validamos que haya respondido a al menos uno.
      return answer && Object.keys(answer).length > 0;
    }

    if (currentQuestion.type === "multiple") {
      if (currentQuestion.minSelections) {
        return answer?.length >= currentQuestion.minSelections;
      }
      return answer && answer.length > 0;
    }

    if (currentQuestion.type === "ranking") {
      return answer && answer.length === currentQuestion.options.length;
    }

    return answer !== undefined && answer !== null && answer !== "";
  };

  const Icon = currentQuestion?.icon;
  const PopupIcon = motivationalMessages[currentPopup]?.icon;

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">
            Encuesta finalizada
          </h2>
          <p className="text-gray-600 mb-6">
            Sus respuestas han sido registradas correctamente en la base de
            datos.
          </p>
          <div className="bg-blue-50 p-4 rounded-lg mb-6">
            <p className="text-sm text-gray-700">
              Agradecera mucho si comparte este cuestionario con otros
              residentes de Almería para aumentar la representatividad del
              estudio:
              https://tesismovilidadurbana-almeria-version-final-d5yj90l4k.vercel.app
            </p>
          </div>
          <button
            onClick={() => {
              setCurrentStep(0);
              setAnswers({});
              setShowResults(false);
              setSubmitError(null);
            }}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Iniciar nueva encuesta
          </button>
        </div>
      </div>
    );
  }

  if (currentQuestion?.type === "intro") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            {currentQuestion.title}
          </h1>
          <div className="text-gray-600 whitespace-pre-line mb-6 text-justify leading-relaxed">
            {currentQuestion.content}
          </div>
          <button
            onClick={handleNext}
            className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center transition-colors font-medium"
          >
            Comenzar encuesta
            <ChevronRight className="ml-2" />
          </button>
        </div>
      </div>
    );
  }

  if (currentQuestion?.type === "final") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">
            {currentQuestion.title}
          </h1>
          <div className="text-gray-600 whitespace-pre-line mb-6 text-justify">
            {currentQuestion.content}
          </div>

          {submitError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-center text-sm">
              <AlertTriangle className="w-5 h-5 mr-2" />
              {submitError}
            </div>
          )}

          <button
            onClick={handleSubmitSurvey}
            disabled={isSubmitting}
            className={`w-full py-3 rounded-lg flex items-center justify-center transition-colors font-medium ${
              isSubmitting
                ? "bg-gray-400 cursor-wait"
                : "bg-green-600 hover:bg-green-700 text-white"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="animate-spin mr-2" /> Procesando datos...
              </>
            ) : (
              "Enviar respuestas"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (currentQuestion?.type === "raffle") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-6 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <Gift className="w-16 h-16 text-purple-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              {currentQuestion.question}
            </h1>
            <p className="text-gray-600">{currentQuestion.subtitle}</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6 text-sm">
            <h3 className="font-semibold text-purple-900 mb-2">
              Bases de participación:
            </h3>
            <ul className="text-gray-700 space-y-1 list-disc list-inside">
              <li>
                <strong>Incentivo:</strong> Tarjeta regalo por valor de 50€.
              </li>
              <li>
                <strong>Resolución:</strong> Comunicación al ganador una semana
                tras el cierre del estudio.
              </li>
              <li>
                <strong>Metodología:</strong> Selección aleatoria certificada
                entre los participantes.
              </li>
              <li>
                <strong>Plazo:</strong> El beneficiario dispondrá de 14 días
                naturales para la aceptación.
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo electrónico <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                placeholder="ejemplo@correo.com"
                value={answers.raffle_email || ""}
                onChange={(e) =>
                  handleRaffleInput("raffle_email", e.target.value)
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nombre y Apellidos <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                placeholder="Nombre completo"
                value={answers.raffle_name || ""}
                onChange={(e) =>
                  handleRaffleInput("raffle_name", e.target.value)
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono de contacto (Opcional)
              </label>
              <input
                type="tel"
                placeholder="+34 600 000 000"
                value={answers.raffle_phone || ""}
                onChange={(e) =>
                  handleRaffleInput("raffle_phone", e.target.value)
                }
                className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none text-sm"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={answers.raffle_terms || false}
                  onChange={(e) =>
                    handleRaffleInput("raffle_terms", e.target.checked)
                  }
                  className="mt-1 w-4 h-4 text-purple-600"
                />
                <span className="text-xs text-gray-600 text-justify">
                  <strong className="text-purple-700">* </strong>
                  Acepto participar en el sorteo y autorizo el uso de mis datos
                  de contacto exclusivamente para la comunicación del premio,
                  conforme a la normativa de protección de datos.
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-4 border-t border-gray-100">
            {/* Previous Button - Always Visible */}
            <button
              onClick={handlePrev}
              className="flex-1 py-3 px-4 rounded-lg flex items-center justify-center transition-colors text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              <ChevronLeft className="mr-2 w-4 h-4" />
              Anterior
            </button>

            {/* Skip Button - Always Visible */}
            <button
              onClick={handleNext}
              className="flex-1 py-3 px-4 rounded-lg flex items-center justify-center transition-colors text-sm font-medium border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              Omitir
              <ChevronRight className="ml-2 w-4 h-4" />
            </button>

            {/* Participate Button - Disabled if invalid */}
            <button
              onClick={handleNext}
              disabled={
                !answers.raffle_email ||
                !answers.raffle_name ||
                !answers.raffle_terms
              }
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center transition-colors text-sm font-medium text-white shadow-md ${
                !answers.raffle_email ||
                !answers.raffle_name ||
                !answers.raffle_terms
                  ? "bg-purple-300 cursor-not-allowed opacity-70"
                  : "bg-purple-600 hover:bg-purple-700 hover:shadow-lg"
              }`}
            >
              Confirmar y Participar
              <CheckCircle className="ml-2 w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6 relative overflow-hidden font-sans">
      {showPopup && (
        <div
          className="fixed z-50 animate-fade-in-down cursor-pointer left-1/2 -translate-x-1/2 w-full max-w-xs px-4"
          onClick={() => setShowPopup(false)}
          style={{
            top: "20px",
          }}
        >
          <div className="bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-white/50 p-3 transform transition-all hover:bg-white/70">
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-600/10 p-2 rounded-full flex-shrink-0">
                {PopupIcon && <PopupIcon className="w-4 h-4 text-indigo-700" />}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-xs mb-0.5 truncate uppercase tracking-wide">
                  {motivationalMessages[currentPopup]?.message}
                </h3>
                <p className="text-xs text-gray-600 leading-snug">
                  {motivationalMessages[currentPopup]?.subtitle}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPopup(false);
                }}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-down {
          0% { opacity: 0; transform: translate(-50%, -10px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.5s ease-out forwards;
        }
      `}</style>

      <div className="max-w-3xl mx-auto pt-8">
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">
            <span>
              Sección {currentStep + 1} / {visibleQuestions.length}
            </span>
            <span>{Math.round(progress)}% Completado</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div
          className={`bg-white rounded-2xl shadow-xl p-8 border border-gray-100 ${
            currentQuestion?.highlight
              ? "ring-4 ring-indigo-50 border-indigo-100"
              : ""
          }`}
        >
          {Icon && (
            <div className="flex justify-center mb-6">
              <div className="bg-indigo-50 p-3 rounded-full">
                <Icon className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          )}

          <h2 className="text-xl md:text-2xl font-bold text-gray-800 mb-2 text-center">
            {currentQuestion?.question}
          </h2>
          {currentQuestion?.subtitle && (
            <p className="text-sm text-gray-500 mb-8 text-center">
              {currentQuestion.subtitle}
            </p>
          )}

          {currentQuestion?.type === "single" && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <div key={option.value}>
                  <label
                    onClick={() => handleAnswer(option.value)}
                    className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                      answers[currentQuestion.id] === option.value
                        ? "border-indigo-600 bg-indigo-50/50"
                        : "border-gray-200 hover:border-indigo-300 bg-white"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 transition-colors ${
                        answers[currentQuestion.id] === option.value
                          ? "border-indigo-600"
                          : "border-gray-300"
                      }`}
                    >
                      {answers[currentQuestion.id] === option.value && (
                        <div className="w-2 h-2 rounded-full bg-indigo-600" />
                      )}
                    </div>
                    <span className="text-gray-700 text-sm font-medium">
                      {option.label}
                    </span>
                  </label>
                  {/* INPUT DE TEXTO PARA "OTROS" */}
                  {option.hasInput &&
                    answers[currentQuestion.id] === option.value && (
                      <input
                        type="text"
                        placeholder="Especifique..."
                        className="mt-2 w-full p-2 border border-gray-300 rounded text-sm focus:border-indigo-500 outline-none ml-8 w-[calc(100%-2rem)]"
                        value={
                          answers[`${currentQuestion.id}_other_text`] || ""
                        }
                        onChange={(e) =>
                          handleOtherInput(currentQuestion.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                </div>
              ))}
            </div>
          )}

          {currentQuestion?.type === "multiple" && (
            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const selected = answers[currentQuestion.id] || [];
                const isSelected = selected.includes(option.value);
                return (
                  <div key={option.value}>
                    <label
                      onClick={() =>
                        handleMultipleAnswer(
                          option.value,
                          currentQuestion.maxSelections
                        )
                      }
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all hover:shadow-sm ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50"
                          : "border-gray-200 hover:border-indigo-300 bg-white"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center mr-3 transition-colors ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-600"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {isSelected && (
                          <CheckCircle className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-gray-700 text-sm font-medium">
                        {option.label}
                      </span>
                    </label>
                    {/* INPUT DE TEXTO PARA "OTROS" */}
                    {option.hasInput && isSelected && (
                      <input
                        type="text"
                        placeholder="Especifique..."
                        className="mt-2 w-full p-2 border border-gray-300 rounded text-sm focus:border-indigo-500 outline-none ml-8 w-[calc(100%-2rem)]"
                        value={
                          answers[`${currentQuestion.id}_other_text`] || ""
                        }
                        onChange={(e) =>
                          handleOtherInput(currentQuestion.id, e.target.value)
                        }
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                );
              })}
              {currentQuestion.maxSelections && (
                <p className="text-xs text-right text-gray-400 mt-2 italic">
                  Seleccionado: {(answers[currentQuestion.id] || []).length} /{" "}
                  {currentQuestion.maxSelections}
                </p>
              )}
            </div>
          )}

          {currentQuestion?.type === "scale" && (
            <div className="py-8">
              <div className="flex justify-between items-center px-2 mb-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
                <span>Muy insatisfecho</span>
                <span>Muy satisfecho</span>
              </div>
              <div className="flex justify-between gap-3">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    onClick={() => handleAnswer(num)}
                    className={`flex-1 aspect-square rounded-lg text-lg font-bold transition-all ${
                      answers[currentQuestion.id] === num
                        ? "bg-indigo-600 text-white shadow-md transform -translate-y-1"
                        : "bg-gray-50 text-gray-600 hover:bg-indigo-50 border border-gray-100"
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentQuestion?.type === "ranking" && (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 mb-6 min-h-[40px]">
                {(answers[currentQuestion.id] || []).map((val, idx) => {
                  const opt = currentQuestion.options.find(
                    (o) => o.value === val
                  );
                  return (
                    <span
                      key={val}
                      className="animate-fade-in-down bg-indigo-50 text-indigo-800 px-3 py-1.5 rounded-full text-xs font-semibold flex items-center border border-indigo-100"
                    >
                      <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] mr-2">
                        {idx + 1}
                      </span>
                      {opt?.label}
                      <button
                        onClick={() => handleRankingAnswer(val)}
                        className="ml-2 text-indigo-400 hover:text-indigo-600 text-sm font-bold"
                      >
                        &times;
                      </button>
                    </span>
                  );
                })}
                {(answers[currentQuestion.id] || []).length === 0 && (
                  <span className="text-sm text-gray-400 italic">
                    Seleccione las opciones abajo en orden de prioridad...
                  </span>
                )}
              </div>

              <div className="h-px bg-gray-100 my-4" />

              {currentQuestion.options.map((option) => {
                const isSelected = (answers[currentQuestion.id] || []).includes(
                  option.value
                );
                return (
                  <button
                    key={option.value}
                    onClick={() => handleRankingAnswer(option.value)}
                    disabled={isSelected}
                    className={`w-full text-left p-4 border rounded-lg transition-all flex justify-between items-center ${
                      isSelected
                        ? "border-gray-100 bg-gray-50/50 text-gray-400 cursor-not-allowed"
                        : "border-gray-200 hover:border-indigo-300 bg-white hover:shadow-sm"
                    }`}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    {!isSelected && (
                      <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                    )}
                    {isSelected && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* TIPO: MATRIX (Contexto x Frecuencia) */}
          {currentQuestion.type === "matrix_context_freq" && (
            <div className="space-y-6">
              {/* Get selected vehicle label */}
              {(() => {
                const vCode = answers.vehicles;
                if (!vCode || vCode === "none")
                  return (
                    <p className="text-gray-500 italic">
                      No hay vehículo seleccionado.
                    </p>
                  );
                const vLabel = questions
                  .find((q) => q.id === "vehicles")
                  .options.find((o) => o.value === vCode)?.label;

                return (
                  <div className="bg-gray-50 p-5 rounded-xl border border-gray-200">
                    <h3 className="font-bold text-indigo-700 mb-4 flex items-center text-lg">
                      <Car className="w-5 h-5 mr-2" /> {vLabel}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Indique la frecuencia de uso para cada situación:
                    </p>

                    <div className="space-y-4">
                      {MATRIX_CONTEXTS.map((ctx) => (
                        <div
                          key={ctx.id}
                          className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm"
                        >
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            {ctx.label}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {MATRIX_FREQUENCIES.map((freq) => {
                              const currentVal =
                                answers[currentQuestion.id]?.[ctx.id];
                              const isSelected = currentVal === freq.value;
                              return (
                                <button
                                  key={freq.value}
                                  onClick={() =>
                                    handleMatrixAnswerSimple(ctx.id, freq.value)
                                  }
                                  className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                    isSelected
                                      ? "bg-indigo-600 text-white border-indigo-600"
                                      : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                                  }`}
                                >
                                  {freq.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          <div className="flex gap-4 mt-10 pt-6 border-t border-gray-100">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center transition-colors text-sm font-medium ${
                currentStep === 0
                  ? "bg-gray-50 text-gray-300 cursor-not-allowed"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <ChevronLeft className="mr-2 w-4 h-4" />
              Anterior
            </button>
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex-1 py-3 px-4 rounded-lg flex items-center justify-center font-semibold transition-all shadow-sm text-sm ${
                !canProceed()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md"
              }`}
            >
              {currentStep === visibleQuestions.length - 1
                ? "Finalizar"
                : "Siguiente"}
              {currentStep !== visibleQuestions.length - 1 && (
                <ChevronRight className="ml-2 w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
