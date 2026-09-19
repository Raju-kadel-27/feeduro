import { Megaphone, Target, TrendingUp, Users } from "lucide-react";

const DURATION = 24;

const ORBIT_CARDS = [
	{
		team: "Sales",
		color: "#f97316",
		title: "Pipeline at stake",
		value: "$1.2M",
		meta: "ARR · 18 open deals",
		fraction: 0,
	},
	{
		team: "Product",
		color: "#8b5cf6",
		title: "Shipped this sprint",
		value: "7 features",
		meta: "High impact · Low effort",
		fraction: 0.25,
	},
	{
		team: "Customer Success",
		color: "#10b981",
		title: "Churn signal",
		value: "$94K",
		meta: "ARR · 5 at-risk accounts",
		fraction: 0.5,
	},
	{
		team: "Marketing",
		color: "#3b82f6",
		title: "Campaign ready",
		value: "6 stories",
		meta: "from top requests",
		fraction: 0.75,
	},
] as const;

const ROLES = [
	{
		Icon: Target,
		name: "Product",
		color: "#8b5cf6",
		iconBg: "rgba(139,92,246,0.10)",
		desc: "Prioritize by revenue impact, not the loudest voice",
	},
	{
		Icon: TrendingUp,
		name: "Sales",
		color: "#f97316",
		iconBg: "rgba(249,115,22,0.10)",
		desc: "Win deals by proving you ship what customers need",
	},
	{
		Icon: Users,
		name: "Customer Success",
		color: "#10b981",
		iconBg: "rgba(16,185,129,0.10)",
		desc: "Spot churn before customers go silent",
	},
	{
		Icon: Megaphone,
		name: "Marketing",
		color: "#3b82f6",
		iconBg: "rgba(59,130,246,0.10)",
		desc: "Launch in your customers' own language",
	},
] as const;

export function TeamsOrbitSection() {
	return (
		<>
			<style>{`
        @keyframes fo-orbit-rotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes fo-card-upright {
          from { transform: translateX(210px) translateY(-50%) rotate(0deg); }
          to   { transform: translateX(210px) translateY(-50%) rotate(-360deg); }
        }
        .fo-arm {
          position: absolute;
          width: 0;
          height: 0;
          top: 50%;
          left: 50%;
          animation: fo-orbit-rotate ${DURATION}s linear infinite;
        }
        .fo-card {
          position: absolute;
          animation: fo-card-upright ${DURATION}s linear infinite;
        }
      `}</style>

			<section className="pt-40 pb-32 px-6 border-t border-border overflow-hidden bg-gray-50/60">
				<div className="max-w-6xl mx-auto">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

						{/* Left: heading + role grid */}
						<div>
							<p className="text-xs font-bold uppercase tracking-widest mb-4 text-violet-600">
								Built for every team
							</p>
							<h2 className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.15] mb-4 text-foreground">
								One signal.{" "}
								<span className="text-muted-foreground font-normal">Every team in sync.</span>
							</h2>
							<p className="text-muted-foreground text-lg mb-10 max-w-md leading-relaxed">
								Feedback comes in once. Sales sees pipeline risk. Product sees sprint fuel. CS sees churn signals. Done.
							</p>

							<div className="grid grid-cols-2 gap-3">
								{ROLES.map(({ Icon, name, color, iconBg, desc }) => (
									<div
										key={name}
										className="rounded-xl p-4"
									>
										<div className="flex items-center gap-2 mb-2">
											<div
												className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
												style={{ background: iconBg }}
											>
												<Icon className="w-3.5 h-3.5" style={{ color }} />
											</div>
											<span className="text-sm font-semibold text-foreground">{name}</span>
										</div>
										<p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
									</div>
								))}
							</div>
						</div>

						{/* Right: orbital system — overflow:visible lets cards extend past the SVG boundary */}
						<div className="hidden lg:flex items-center justify-center">
							<div className="relative w-[460px] h-[460px]" style={{ overflow: "visible" }}>

								{/* SVG orbit rings */}
								<svg
									className="absolute inset-0 w-full h-full overflow-visible"
									viewBox="0 0 460 460"
									fill="none"
									overflow="visible"
									aria-hidden
								>
									<circle
										cx="230" cy="230" r="240"
										stroke="rgba(0,0,0,0.18)"
										strokeWidth="1.5"
										strokeDasharray="6 8"
									/>
									<circle
										cx="230" cy="230" r="75"
										stroke="rgba(139,92,246,0.25)"
										strokeWidth="1"
										strokeDasharray="3 6"
									/>
								</svg>

								{/* Nucleus — centered via top/left 50% on the 460px container */}
								<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
									<div
										className="w-24 h-24 rounded-full flex items-center justify-center border border-violet-200"
										style={{ background: "rgba(139,92,246,0.06)" }}
									>
										<div
											className="w-12 h-12 rounded-full shadow-sm"
											style={{
												background: "linear-gradient(135deg, #8b5cf6 0%, #6366f1 50%, #3b82f6 100%)",
											}}
										/>
									</div>
								</div>

								{/* Orbiting cards */}
								{ORBIT_CARDS.map((card) => {
									const delay = `-${card.fraction * DURATION}s`;
									return (
										<div
											key={card.team}
											className="fo-arm"
											style={{ animationDelay: delay }}
										>
											<div className="fo-card" style={{ animationDelay: delay }}>
												<div className="rounded-xl px-3.5 py-3 w-[190px] bg-white border border-gray-200 shadow-sm">
													<span
														className="inline-block text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded mb-2"
														style={{
															color: card.color,
															background: `${card.color}14`,
														}}
													>
														{card.team}
													</span>
													<p className="text-xs text-gray-500 mb-0.5 leading-snug">
														{card.title}
													</p>
													<p className="text-[17px] font-bold text-gray-900 leading-tight">
														{card.value}
													</p>
													<p className="text-[11.5px] text-gray-400 mt-1">
														{card.meta}
													</p>
												</div>
											</div>
										</div>
									);
								})}

							</div>
						</div>

					</div>
				</div>
			</section>
		</>
	);
}
