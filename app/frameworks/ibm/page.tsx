function TierHeader({
  tier,
  name,
  color,
}: {
  tier: string;
  name: string;
  color: string;
}) {
  return (
    <th
      className={`px-5 py-4 text-left text-xs font-bold uppercase tracking-wider ${color} align-top`}
    >
      <div>{tier}</div>
      <div className="mt-0.5">{name}</div>
    </th>
  );
}

export default function IBMFrameworkPage() {
  return (
    <main className="max-w-5xl mx-auto px-6 py-12 print:py-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">
            DaaS Product Framework: Tiered Licensing Model
          </h1>
          <p className="text-sm font-semibold text-zinc-500 uppercase tracking-wide mt-1">
            pharosIQ Confidential
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-zinc-500">April 2026</p>
          <p className="text-sm font-medium text-zinc-700 mt-0.5">
            Prepared for IBM
          </p>
        </div>
      </div>

      <div className="h-1 bg-red-600 rounded-full mt-4 mb-10" />

      {/* Intro */}
      <p className="text-zinc-700 text-sm leading-relaxed mb-10">
        pharosIQ&apos;s intent data is sourced from first-party content properties
        (CONTENTgine + MRP), not bid-stream inference or co-op panels. Each tier
        below adds a layer of resolution, from account-level signals through
        persona-level profiles to contact-level records. Tiers are additive: each
        includes everything in the tier below it.
      </p>

      {/* ===== TIER COMPARISON TABLE ===== */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-zinc-200">
              <th className="px-5 py-4 w-36" />
              <TierHeader
                tier="Tier 1: Accounts +"
                name="Intent Topics"
                color="text-zinc-600"
              />
              <TierHeader
                tier="Tier 2: Persona +"
                name="Intent Topics"
                color="text-blue-700"
              />
              <TierHeader
                tier="Tier 3: Contacts +"
                name="Intent"
                color="text-purple-700"
              />
              <TierHeader
                tier="Tier 4: Contacts +"
                name="Content (Enterprise)"
                color="text-red-600"
              />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {/* Deliverable */}
            <tr>
              <td className="px-5 py-5 font-semibold text-zinc-700 align-top">
                What you get
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Account-level intent signals. Which companies are surging on which
                topics. No persona detail, no contacts.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Everything in Tier 1, plus audience-level behavioral profiles
                matched to intent categories: industry, title function, seniority
                band, company size, intent topic, engagement source.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Everything in Tier 2, plus contact-level records: name, title,
                email, company, engagement source, intent topic. Delivered via API,
                flat file, or cloud sync on a rolling 90-day signal window.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Everything in Tier 3, plus the specific content assets consumed
                (whitepaper, webinar, content piece). The complete behavioral
                fingerprint.
              </td>
            </tr>

            {/* Who it's for */}
            <tr className="bg-zinc-50">
              <td className="px-5 py-5 font-semibold text-zinc-700 align-top">
                Best for
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Teams that need account-level surge visibility to prioritize
                outbound and inform media strategy. Fastest time to value.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Teams that want to understand who inside an account is showing
                intent, not just that the account is active. Powers persona-based
                targeting and segmentation.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Sales and marketing teams activating contact-level data directly:
                outbound sequences, CRM enrichment, ABM programs. Also available
                for platform integration via API or OEM.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Enterprise platforms where pharosIQ data becomes core
                infrastructure. Full content consumption visibility at scale.
              </td>
            </tr>

            {/* ACV range */}
            <tr>
              <td className="px-5 py-5 font-semibold text-zinc-700 align-top">
                Annual investment
              </td>
              <td className="px-5 py-5 align-top">
                <div className="font-semibold text-zinc-900">$48K to $125K</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  $4K-$10.4K/mo
                </div>
              </td>
              <td className="px-5 py-5 align-top">
                <div className="font-semibold text-zinc-900">$120K to $192K</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  $10K-$16K/mo
                </div>
              </td>
              <td className="px-5 py-5 align-top">
                <div className="font-semibold text-zinc-900">$288K to $1M</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  $24K-$84K/mo
                </div>
              </td>
              <td className="px-5 py-5 align-top">
                <div className="font-semibold text-zinc-900">$2.4M+</div>
                <div className="text-zinc-500 text-xs mt-0.5">
                  $200K+/mo
                </div>
              </td>
            </tr>

            {/* Coverage */}
            <tr className="bg-zinc-50">
              <td className="px-5 py-5 font-semibold text-zinc-700 align-top">
                Includes
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Up to 30,000 accounts
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Up to 30,000 accounts
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Up to 30,000 accounts
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                Up to 30,000 accounts
              </td>
            </tr>

            {/* Delivery */}
            <tr>
              <td className="px-5 py-5 font-semibold text-zinc-700 align-top">
                Delivery
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                API, flat file, cloud delivery, segment push to DSP, LiveRamp,
                CDP, SSP.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                API, flat file, cloud delivery, segment push to DSP, LiveRamp,
                CDP, SSP.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                API, flat file, cloud sync. Direct activation or OEM/API embed
                into your platform.
              </td>
              <td className="px-5 py-5 align-top text-zinc-600">
                OEM or API at scale. Per-user-block pricing tied to deployment
                scale.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Data points */}
      <div className="mt-12 grid grid-cols-3 gap-6">
        <div className="border border-zinc-200 rounded-lg p-5 text-center">
          <div className="text-2xl font-bold text-zinc-900">360M+</div>
          <div className="text-xs text-zinc-500 mt-1">Full contact universe</div>
        </div>
        <div className="border border-zinc-200 rounded-lg p-5 text-center">
          <div className="text-2xl font-bold text-zinc-900">650+</div>
          <div className="text-xs text-zinc-500 mt-1">Intent categories</div>
        </div>
        <div className="border border-zinc-200 rounded-lg p-5 text-center">
          <div className="text-2xl font-bold text-zinc-900">First-party</div>
          <div className="text-xs text-zinc-500 mt-1">
            Sourced from owned content properties
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 mt-16 pt-6">
        <p className="text-xs text-zinc-400">
          pharosIQ Confidential. Prepared for IBM, April 2026.
        </p>
      </div>

      <div className="h-8" />
    </main>
  );
}
