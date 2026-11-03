-- Least privilege: TRUNCATE bypasses RLS, and REFERENCES/TRIGGER are not needed by the app.
revoke truncate, references, trigger on public.cards from anon, authenticated;
revoke all on public.cards from anon;

-- Enforce on the server the same limits the form applies in the browser.
alter table public.cards
  add constraint cards_title_length check (char_length(title) <= 120),
  add constraint cards_assignee_length check (char_length(assignee) <= 60);
