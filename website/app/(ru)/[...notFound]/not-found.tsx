import { NotFoundView } from "@/components/views/not-found";

/**
 * The boundary the catch-all's `notFound()` renders into.
 *
 * Russian, because a URL that matches no route in either language is far more
 * likely to be a stale Russian link than an English one — and because this
 * branch lives in the Russian route group, whose root layout already declared
 * <html lang="ru-RU"> by the time we get here.
 */
export default function CatchAllNotFound() {
  return <NotFoundView locale="ru" />;
}
