// Абсолютный URL приложения с учётом base ('/family_three/' на проде,
// '/' на localhost) — используется как emailRedirectTo при регистрации.
export function siteUrl(): string {
  return window.location.origin + import.meta.env.BASE_URL
}
