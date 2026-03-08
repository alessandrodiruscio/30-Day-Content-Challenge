const en = {
  translation: {
    appName: "30-Day Content Challenge",
    back: "Back",

    // Header / Nav
    nav: {
      account: "Account",
      myStrategies: "My Strategies",
      recommendedTools: "Recommended Tools",
      joinCommunity: "Join the Community",
      profileSettings: "Profile Settings",
      logout: "Logout",
      loginRegister: "Login / Register",
    },

    // Landing
    landing: {
      badge: "30-Day Content Challenge",
      heading1: "Turn Your Expertise Into",
      heading2: "30 Viral Reels",
      description: "Stop staring at a blank screen. Tell us about your business, and we'll craft a cohesive, 30-day content series with full scripts and visual storyboards. Perfect for your next Instagram challenge.",
      howItWorks: "How it works",
      steps: [
        "Fill out your business profile (niche, products, audience).",
        "Choose from 3 AI-generated content strategy concepts.",
        "Get 30 days of word-for-word scripts and visual plans.",
        "Post one Reel per day and watch your authority grow!",
      ],
      startChallenge: "Start Your Challenge",
      loginToStart: "Login to Start",
      viewStrategies: "View My Saved Strategies",
      quote: '"Consistency is the bridge between goals and accomplishment."',
      features: [
        { title: "Niche Focused", desc: "Tailored to your specific market and audience pain points." },
        { title: "Sales Driven", desc: "Strategically designed to convert followers into paying clients." },
        { title: "30-Day Plan", desc: "A complete roadmap so you never miss a day of posting." },
      ],
    },

    // Loading
    loading: {
      restoringSession: "Restoring your session...",
      craftingConcepts: "Crafting Your Concepts...",
      generatingSeries: "Generating Full Scripts & Researching Market...",
      progress: "Progress",
      refining: "Refining last changes...",
      coffeeMessage: "This will take 2-3 minutes. Why not grab a coffee? ☕",
      quote: '"Consistency is the bridge between goals and accomplishment."',
    },

    // Auth
    auth: {
      login: "Login",
      register: "Register",
      welcomeBack: "Welcome Back",
      createAccount: "Create Account",
      resetPassword: "Reset Password",
      dbIssueTitle: "Database Connection Issue",
      dbIssueDesc: "The server is having trouble connecting to the database. Please check your AI Studio Secrets (DB_HOST, DB_USER, etc.).",
      forgotPasswordDesc: "Enter your email and we'll send you a link to reset your password.",
      saveStrategiesDesc: "Save your 30-day strategies and access them anytime.",
      emailAddress: "Email Address",
      password: "Password",
      forgotPassword: "Forgot Password?",
      processing: "Processing...",
      sendResetLink: "Send Reset Link",
      backToLogin: "Back to Login",
      authFailed: "Authentication failed",
      connectionError: "Connection error",
    },

    // Form
    form: {
      title: "Create New Strategy",
      subtitle: "Tell us about your business",
      profileHint: "We'll use your saved profile to craft this strategy. You can still adjust details below if needed.",
      profileHintNew: "The more detail you provide, the better the content series will be.",
      usingProfile: "Using Business Profile",
      hideDetails: "Hide Details",
      editDetails: "Edit Details",
      niche: {
        label: "What is your niche?",
        placeholder: "e.g. Fitness Coach for Busy Moms",
        tooltip: "Be specific! Instead of 'Fitness', try 'Postpartum Fitness for Busy Moms'. This helps the AI tailor the content perfectly.",
      },
      products: {
        label: "What products or services do you sell?",
        placeholder: "e.g. 1-on-1 Coaching, Digital Meal Plans",
        tooltip: "Mention your core offers. The AI will strategically weave these into your content to drive sales.",
      },
      problems: {
        label: "What are the top 3 problems you help your clients solve?",
        placeholder: "e.g. No time to cook, lack of motivation, slow metabolism",
        tooltip: "Content that solves problems builds trust. List the biggest frustrations your audience has.",
      },
      audience: {
        label: "Who is your ideal target audience?",
        placeholder: "e.g. Working moms aged 30-45",
        tooltip: "Describe your dream client. Think about their age, lifestyle, and what keeps them up at night.",
      },
      contentType: {
        label: "What type of content should the challenge focus on?",
        tooltip: "Choose the 'vibe' of your 30-day series. This dictates the balance between teaching, selling, and storytelling.",
        options: [
          "Suggestions & Advice",
          "Motivational Stories & Mindset",
          "Tools, Resources & Tech",
          "Behind the Scenes & Process",
          "Client Results & Case Studies",
          "Mixed / Surprise Me",
        ],
      },
      tone: {
        label: "What tone should the content have?",
        tooltip: "Your brand voice. Professional for B2B, Energetic for fitness, or Witty for lifestyle brands.",
        options: [
          "Professional & Helpful",
          "Energetic & Motivating",
          "Witty & Entertaining",
          "Educational & Direct",
          "Empathetic & Soft",
        ],
      },
      startDate: {
        label: "When do you want to start the challenge?",
        tooltip: "We'll use this to date your 30-day calendar.",
      },
      generate: "Generate Content Series",
    },

    // Results
    results: {
      title: "Choose Your Series",
      description: "We've generated 3 distinct directions for your 30-day challenge.",
      option: "Option",
      editProfile: "Edit Profile",
      selectApiKey: "Select API Key Now",
    },

    // Strategies List
    strategies: {
      title: "My Saved Strategies",
      subtitle: "Access all your generated 30-day content challenges.",
      createNew: "Create New Strategy",
      viewFull: "View Full Plan",
      empty: "No strategies saved yet. Start your first challenge!",
      createFirst: "Create Your First Strategy",
      deleteConfirm: "Are you sure you want to delete this strategy?",
      deleteFailed: "Failed to delete strategy",
    },

    // Series Detail
    detail: {
      exportPdf: "Export PDF",
      share: "Share",
      calendarRoadmap: "Calendar Roadmap",
      done: "Done",
      starts: "Starts",
      seriesLabel: "30-Day Series",
      dayContent: "Day {{day}} Content",
      reelStrategy: "Reel Strategy & Script",
      completed: "Completed",
      markDone: "Mark as Done",
      hookLabel: "The Hook (Option {{index}}/3)",
      scriptLabel: "Full Script (Word-for-Word)",
      showStoryboard: "Show Storyboard",
      hideStoryboard: "Hide Storyboard",
      creatorAction: "📹 Creator Action:",
      ctaLabel: "Call to Action (CTA)",
      captionLabel: "Suggested Caption",
      inspirationTitle: "Inspiration Videos",
      inspirationDesc: "Find videos from other creators who covered similar topics for research and inspiration.",
      previousDay: "Previous Day",
      nextDay: "Next Day",
      community: {
        joinConversation: "Join the Conversation",
        joinCommunity: "Join Our Private Community",
        connectDesc: "Connect with other creators in our private Discord and share your progress!",
        exclusiveDesc: "Get exclusive feedback, weekly coaching calls, and a supportive network of creators.",
        joinDiscord: "Join Discord Community",
        join: "Join the Community",
      },
    },

    // Profile
    profile: {
      title: "Profile Settings",
      subtitle: "These details will be used as the default for all your new strategies.",
      saving: "Saving...",
      save: "Save Profile Settings",
    },

    // Recommended Tools
    tools: {
      title: "Recommended Tools",
      subtitle: "The best software to help you record, edit, and schedule your Reels.",
      access: "Access {{name}}",
      items: {
        ecamm: {
          name: "eCamm Live",
          description: "The ultimate live production platform for Mac. Perfect for high-quality Reels and live streams.",
        },
        descript: {
          name: "Descript",
          description: "AI-powered video editor that makes editing as easy as editing a text document. Great for captions and quick cuts.",
        },
        socialbee: {
          name: "Socialbee",
          description: "Manage your social media posts with ease. Schedule your 30-day challenge in minutes.",
        },
        youcam: {
          name: "YouCam Video",
          description: "Perfect your look with AI-powered video retouching and makeup. Ideal for talking-head Reels.",
        },
      },
    },

    // Reset Password
    resetPassword: {
      success: "Password Reset!",
      successDesc: "Your password has been successfully updated. You can now login with your new password.",
      goToLogin: "Go to Login",
      title: "Set New Password",
      subtitle: "Enter your new password below to regain access to your account.",
      newPassword: "New Password",
      confirmPassword: "Confirm New Password",
      passwordMismatch: "Passwords do not match",
      resetFailed: "Reset failed",
      connectionError: "Connection error",
      updating: "Updating...",
      reset: "Reset Password",
    },
  },
};

export default en;
