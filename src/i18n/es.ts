const es = {
  translation: {
    appName: "Reto de Contenido 30 Días",
    back: "Atrás",

    // Header / Nav
    nav: {
      account: "Cuenta",
      myStrategies: "Mis Estrategias",
      recommendedTools: "Herramientas Recomendadas",
      joinCommunity: "Únete a la Comunidad",
      profileSettings: "Configuración de Perfil",
      logout: "Cerrar Sesión",
      loginRegister: "Iniciar Sesión / Registrarse",
    },

    // Landing
    landing: {
      badge: "Reto de Contenido 30 Días",
      heading1: "Convierte Tu Experiencia En",
      heading2: "30 Reels Virales",
      description: "Deja de mirar una pantalla en blanco. Cuéntanos sobre tu negocio y crearemos una serie de contenido cohesiva de 30 días con guiones completos y guiones visuales. Perfecto para tu próximo reto de Instagram.",
      howItWorks: "Cómo funciona",
      steps: [
        "Completa tu perfil de negocio (nicho, productos, audiencia).",
        "Elige entre 3 conceptos de estrategia de contenido generados por IA.",
        "Obtén 30 días de guiones palabra por palabra y planes visuales.",
        "¡Publica un Reel por día y observa cómo crece tu autoridad!",
      ],
      startChallenge: "Iniciar Tu Reto",
      loginToStart: "Inicia Sesión para Comenzar",
      viewStrategies: "Ver Mis Estrategias Guardadas",
      quote: '"La consistencia es el puente entre los objetivos y el logro."',
      features: [
        { title: "Enfocado en el Nicho", desc: "Adaptado a tu mercado específico y los puntos de dolor de tu audiencia." },
        { title: "Orientado a Ventas", desc: "Diseñado estratégicamente para convertir seguidores en clientes de pago." },
        { title: "Plan de 30 Días", desc: "Una hoja de ruta completa para que nunca te pierdas un día de publicación." },
      ],
    },

    // Loading
    loading: {
      restoringSession: "Restaurando tu sesión...",
      craftingConcepts: "Creando Tus Conceptos...",
      generatingSeries: "Generando Guiones Completos e Investigando el Mercado...",
      progress: "Progreso",
      refining: "Refinando los últimos cambios...",
      coffeeMessage: "Esto tomará 2-3 minutos. ¿Por qué no te preparas un café? ☕",
      quote: '"La consistencia es el puente entre los objetivos y el logro."',
    },

    // Auth
    auth: {
      login: "Iniciar Sesión",
      register: "Registrarse",
      welcomeBack: "Bienvenido de Vuelta",
      createAccount: "Crear Cuenta",
      resetPassword: "Restablecer Contraseña",
      dbIssueTitle: "Problema de Conexión a la Base de Datos",
      dbIssueDesc: "El servidor tiene problemas para conectarse a la base de datos. Por favor verifica tus secretos de AI Studio (DB_HOST, DB_USER, etc.).",
      forgotPasswordDesc: "Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.",
      saveStrategiesDesc: "Guarda tus estrategias de 30 días y accede a ellas en cualquier momento.",
      emailAddress: "Correo Electrónico",
      password: "Contraseña",
      forgotPassword: "¿Olvidaste tu contraseña?",
      processing: "Procesando...",
      sendResetLink: "Enviar Enlace de Restablecimiento",
      backToLogin: "Volver al Inicio de Sesión",
      authFailed: "Autenticación fallida",
      connectionError: "Error de conexión",
    },

    // Form
    form: {
      title: "Crear Nueva Estrategia",
      subtitle: "Cuéntanos sobre tu negocio",
      profileHint: "Usaremos tu perfil guardado para crear esta estrategia. Aún puedes ajustar los detalles a continuación si es necesario.",
      profileHintNew: "Cuantos más detalles proporciones, mejor será la serie de contenido.",
      usingProfile: "Usando Perfil de Negocio",
      hideDetails: "Ocultar Detalles",
      editDetails: "Editar Detalles",
      niche: {
        label: "¿Cuál es tu nicho?",
        placeholder: "ej. Coach de Fitness para Mamás Ocupadas",
        tooltip: "¡Sé específico! En lugar de 'Fitness', prueba 'Fitness Postparto para Mamás Ocupadas'. Esto ayuda a la IA a adaptar el contenido perfectamente.",
      },
      products: {
        label: "¿Qué productos o servicios vendes?",
        placeholder: "ej. Coaching 1-a-1, Planes de Comida Digitales",
        tooltip: "Menciona tus ofertas principales. La IA las integrará estratégicamente en tu contenido para impulsar las ventas.",
      },
      problems: {
        label: "¿Cuáles son los 3 principales problemas que ayudas a resolver a tus clientes?",
        placeholder: "ej. Sin tiempo para cocinar, falta de motivación, metabolismo lento",
        tooltip: "El contenido que resuelve problemas genera confianza. Lista las mayores frustraciones de tu audiencia.",
      },
      audience: {
        label: "¿Quién es tu audiencia objetivo ideal?",
        placeholder: "ej. Mamás trabajadoras de 30-45 años",
        tooltip: "Describe a tu cliente ideal. Piensa en su edad, estilo de vida y qué les preocupa.",
      },
      contentType: {
        label: "¿En qué tipo de contenido debe enfocarse el reto?",
        tooltip: "Elige el 'ambiente' de tu serie de 30 días. Esto dicta el equilibrio entre enseñar, vender y contar historias.",
        options: [
          "Sugerencias y Consejos",
          "Historias Motivacionales y Mentalidad",
          "Herramientas, Recursos y Tecnología",
          "Detrás de Cámaras y Proceso",
          "Resultados de Clientes y Casos de Éxito",
          "Mixto / Sorpréndeme",
        ],
      },
      tone: {
        label: "¿Qué tono debe tener el contenido?",
        tooltip: "Tu voz de marca. Profesional para B2B, Enérgico para fitness, o Ingenioso para marcas de estilo de vida.",
        options: [
          "Profesional y Útil",
          "Enérgico y Motivador",
          "Ingenioso y Entretenido",
          "Educativo y Directo",
          "Empático y Suave",
        ],
      },
      startDate: {
        label: "¿Cuándo quieres comenzar el reto?",
        tooltip: "Usaremos esto para fechar tu calendario de 30 días.",
      },
      generate: "Generar Serie de Contenido",
    },

    // Results
    results: {
      title: "Elige Tu Serie",
      description: "Hemos generado 3 direcciones distintas para tu reto de 30 días.",
      option: "Opción",
      editProfile: "Editar Perfil",
      selectApiKey: "Seleccionar Clave API Ahora",
    },

    // Strategies List
    strategies: {
      title: "Mis Estrategias Guardadas",
      subtitle: "Accede a todos tus retos de contenido de 30 días generados.",
      createNew: "Crear Nueva Estrategia",
      viewFull: "Ver Plan Completo",
      empty: "Aún no hay estrategias guardadas. ¡Comienza tu primer reto!",
      createFirst: "Crear Tu Primera Estrategia",
      deleteConfirm: "¿Estás seguro de que deseas eliminar esta estrategia?",
      deleteFailed: "Error al eliminar la estrategia",
    },

    // Series Detail
    detail: {
      exportPdf: "Exportar PDF",
      share: "Compartir",
      calendarRoadmap: "Hoja de Ruta del Calendario",
      done: "Listo",
      starts: "Comienza",
      seriesLabel: "Serie de 30 Días",
      dayContent: "Contenido del Día {{day}}",
      reelStrategy: "Estrategia y Guión del Reel",
      completed: "Completado",
      markDone: "Marcar como Hecho",
      hookLabel: "El Gancho (Opción {{index}}/3)",
      scriptLabel: "Guión Completo (Palabra por Palabra)",
      showStoryboard: "Mostrar Guión Visual",
      hideStoryboard: "Ocultar Guión Visual",
      creatorAction: "📹 Acción del Creador:",
      ctaLabel: "Llamada a la Acción (CTA)",
      captionLabel: "Descripción Sugerida",
      inspirationTitle: "Videos de Inspiración",
      inspirationDesc: "Encuentra videos de otros creadores que cubrieron temas similares para investigación e inspiración.",
      previousDay: "Día Anterior",
      nextDay: "Día Siguiente",
      community: {
        joinConversation: "Únete a la Conversación",
        joinCommunity: "Únete a Nuestra Comunidad Privada",
        connectDesc: "¡Conéctate con otros creadores en nuestro Discord privado y comparte tu progreso!",
        exclusiveDesc: "Obtén feedback exclusivo, llamadas de coaching semanales y una red de creadores de apoyo.",
        joinDiscord: "Unirse a la Comunidad Discord",
        join: "Unirse a la Comunidad",
      },
    },

    // Profile
    profile: {
      title: "Configuración de Perfil",
      subtitle: "Estos detalles se usarán como predeterminados para todas tus nuevas estrategias.",
      saving: "Guardando...",
      save: "Guardar Configuración de Perfil",
    },

    // Recommended Tools
    tools: {
      title: "Herramientas Recomendadas",
      subtitle: "El mejor software para grabar, editar y programar tus Reels.",
      access: "Acceder a {{name}}",
      items: {
        ecamm: {
          name: "eCamm Live",
          description: "La plataforma de producción en vivo definitiva para Mac. Perfecta para Reels de alta calidad y transmisiones en vivo.",
        },
        descript: {
          name: "Descript",
          description: "Editor de video con IA que hace la edición tan fácil como editar un documento de texto. Ideal para subtítulos y cortes rápidos.",
        },
        socialbee: {
          name: "Socialbee",
          description: "Gestiona tus publicaciones en redes sociales con facilidad. Programa tu reto de 30 días en minutos.",
        },
        youcam: {
          name: "YouCam Video",
          description: "Perfecciona tu apariencia con retoque de video y maquillaje con IA. Ideal para Reels de cara a cámara.",
        },
      },
    },

    // Reset Password
    resetPassword: {
      success: "¡Contraseña Restablecida!",
      successDesc: "Tu contraseña ha sido actualizada exitosamente. Ahora puedes iniciar sesión con tu nueva contraseña.",
      goToLogin: "Ir al Inicio de Sesión",
      title: "Establecer Nueva Contraseña",
      subtitle: "Ingresa tu nueva contraseña a continuación para recuperar el acceso a tu cuenta.",
      newPassword: "Nueva Contraseña",
      confirmPassword: "Confirmar Nueva Contraseña",
      passwordMismatch: "Las contraseñas no coinciden",
      resetFailed: "Error al restablecer",
      connectionError: "Error de conexión",
      updating: "Actualizando...",
      reset: "Restablecer Contraseña",
    },
  },
};

export default es;
