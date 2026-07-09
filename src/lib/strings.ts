// Все русские строки UI — в одном месте, чтобы не размазывать тексты по компонентам.
export const STR = {
  appName: 'Семейное древо',
  supabaseNotConfigured:
    'Supabase не настроен: заполните VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY в .env.local и перезапустите dev-сервер.',

  // Auth
  loginTitle: 'Вход',
  registerTitle: 'Регистрация',
  emailLabel: 'Email',
  passwordLabel: 'Пароль',
  nameLabel: 'Ваше имя',
  namePlaceholder: 'Например: Леонид',
  loginButton: 'Войти',
  registerButton: 'Зарегистрироваться',
  noAccount: 'Нет аккаунта?',
  haveAccount: 'Уже есть аккаунт?',
  toRegister: 'Зарегистрироваться',
  toLogin: 'Войти',
  checkEmailTitle: 'Подтвердите почту',
  checkEmailText: 'Мы отправили письмо со ссылкой подтверждения на',
  checkEmailHint: 'Если письма нет — проверьте папку «Спам».',
  signOut: 'Выйти',

  // Pending / rejected
  pendingTitle: 'Заявка на рассмотрении',
  pendingText:
    'Ваш аккаунт создан. Администратор должен одобрить его — после этого откроется доступ к семейному древу.',
  rejectedTitle: 'Заявка отклонена',
  rejectedText: 'Администратор отклонил вашу заявку. Если это ошибка — свяжитесь с ним.',
  checkAgain: 'Проверить ещё раз',
  stillPending: 'Пока не одобрено. Попробуйте позже.',

  // Admin
  adminNav: 'Заявки и участники',
  adminTitle: 'Участники',
  approve: 'Одобрить',
  reject: 'Отклонить',
  statusPending: 'Ожидает',
  statusApproved: 'Одобрен',
  statusRejected: 'Отклонён',
  roleAdmin: 'админ',
  colName: 'Имя',
  colEmail: 'Email',
  colDate: 'Регистрация',
  colStatus: 'Статус',
  colActions: 'Действия',
  noProfiles: 'Пока никто не зарегистрирован.',

  // Board (Спринт 2)
  boardPlaceholder: 'Доска семейного древа появится здесь в Спринте 2 🌳',

  // Общее
  saved: 'Сохранено',
  loadError: 'Не удалось загрузить данные',
  saveError: 'Не удалось сохранить',

  // Ошибки auth
  errInvalidCredentials: 'Неверный email или пароль',
  errEmailNotConfirmed: 'Email не подтверждён — проверьте почту, мы отправляли письмо со ссылкой',
  errUserExists: 'Пользователь с таким email уже зарегистрирован',
  errPasswordShort: 'Пароль должен быть не короче 6 символов',
  errRateLimit: 'Слишком много попыток — подождите немного и попробуйте снова',
  errGeneric: 'Что-то пошло не так, попробуйте ещё раз',
} as const
