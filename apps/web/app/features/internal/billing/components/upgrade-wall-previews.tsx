// SVG preview illustrations for each gated feature. All viewBox="0 0 900 320".
// Colors are intentionally light-mode so they read as a "screenshot" in any theme.

const S = "#f8fafc"; // page bg
const W = "white";   // card bg
const B = "#e2e8f0"; // border
const G = "#f1f5f9"; // grid / subtle bg
const M = "#cbd5e1"; // muted text line
const D = "#0f172a"; // dark text
const X = "#94a3b8"; // medium label

const svgProps = { viewBox: "0 0 900 500", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: "w-full h-full", preserveAspectRatio: "xMidYMin slice", style: { background: "#f8fafc" } };

export function AnalyticsPreview() {
	const cards = [[16,192,64,80],[220,192,72,88],[424,192,56,72],[628,256,68,60]] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			{cards.map(([x,w,lw,vw], i) => (
				<g key={i}>
					<rect x={x} y={16} width={w} height={88} rx={10} fill={W} stroke={B} />
					<rect x={x+16} y={33} width={lw} height={7} rx={3.5} fill={M} />
					<rect x={x+16} y={52} width={vw} height={14} rx={5} fill={D} />
					<rect x={x+16} y={78} width={52} height={7} rx={3.5} fill={i<3?"#86efac":"#fca5a5"} />
				</g>
			))}
			<rect x={16} y={120} width={868} height={184} rx={10} fill={W} stroke={B} />
			<rect x={32} y={136} width={72} height={8} rx={4} fill={D} />
			{[162,188,214,240].map(y => <line key={y} x1={72} y1={y} x2={868} y2={y} stroke={G} strokeWidth={1} />)}
			{[162,188,214,240].map((y,i) => <rect key={y} x={32} y={y-3} width={[24,20,24,16][i]} height={6} rx={3} fill={B} />)}
			<defs><linearGradient id="anlG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366f1" stopOpacity={0.2}/><stop offset="100%" stopColor="#6366f1" stopOpacity={0}/></linearGradient></defs>
			<path d="M72 242 C150 236 210 218 290 206 S410 184 500 172 S630 158 730 150 S820 145 868 140" stroke="#6366f1" strokeWidth={2.5} strokeLinecap="round" />
			<path d="M72 242 C150 236 210 218 290 206 S410 184 500 172 S630 158 730 150 S820 145 868 140 L868 290 L72 290Z" fill="url(#anlG)" />
			<path d="M72 228 C160 225 230 220 310 218 S430 222 530 218 S660 214 760 208 S840 204 868 200" stroke="#22c55e" strokeWidth={1.5} strokeLinecap="round" strokeDasharray="4 4" opacity={0.7} />
			{[72,196,320,444,568,692,816].map((x,i) => <rect key={i} x={x} y={258} width={24} height={6} rx={3} fill={B} />)}
		</svg>
	);
}

export function TeamPreview() {
	const rows = [
		[88,128,"#dbeafe","#1d4ed8"],[72,112,"#dcfce7","#15803d"],
		[96,140,"#dcfce7","#15803d"],[80,120,"#f1f5f9","#475569"],
		[84,132,"#dbeafe","#1d4ed8"],
	] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={520} height={36} rx={8} fill={W} stroke={B} />
			<circle cx={32} cy={34} r={7} fill="none" stroke={M} strokeWidth={1.5} />
			<rect x={48} y={29} width={120} height={8} rx={4} fill={M} />
			<rect x={752} y={16} width={132} height={36} rx={8} fill="#f97316" />
			<rect x={780} y={27} width={76} height={10} rx={5} fill={W} opacity={0.9} />
			<rect x={0} y={68} width={900} height={36} fill={S} stroke={B} strokeWidth={0.5} />
			{[[72,64],[280,48],[480,40],[640,52],[820,40]].map(([x,w],i) => <rect key={i} x={x} y={82} width={w} height={7} rx={3.5} fill={X} />)}
			{rows.map(([nw,ew,rc,rt], i) => {
				const y = 104 + i * 44;
				return (
					<g key={i}>
						<rect x={0} y={y} width={900} height={44} fill={i%2===0?W:"#fafafa"} />
						<line x1={0} y1={y} x2={900} y2={y} stroke={G} strokeWidth={1} />
						<circle cx={36} cy={y+22} r={16} fill={B} />
						<circle cx={36} cy={y+18} r={7} fill={M} />
						<ellipse cx={36} cy={y+36} rx={13} ry={9} fill={M} />
						<rect x={64} y={y+11} width={nw} height={8} rx={4} fill={D} />
						<rect x={64} y={y+25} width={ew} height={7} rx={3.5} fill={M} />
						<rect x={468} y={y+13} width={68} height={20} rx={10} fill={rc} />
						<rect x={488} y={y+19} width={28} height={7} rx={3.5} fill={rt} opacity={0.8} />
						<rect x={628} y={y+19} width={72} height={7} rx={3.5} fill={M} />
						{[836,848,860].map(cx => <circle key={cx} cx={cx} cy={y+22} r={2.5} fill={M} />)}
					</g>
				);
			})}
		</svg>
	);
}

export function IntegrationsPreview() {
	const apps = [
		["#4f46e5",72],["#0052cc",36],["#1b1f23",60],
		["#4a154b",44],["#ea4335",52],["#00aeff",64],
		["#ff6b35",48],["#0891b2",56],["#7c3aed",40],
	] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={520} height={36} rx={8} fill={W} stroke={B} />
			<rect x={40} y={28} width={140} height={8} rx={4} fill={M} />
			<rect x={556} y={16} width={128} height={36} rx={8} fill={W} stroke={B} />
			<rect x={572} y={28} width={80} height={8} rx={4} fill={M} />
			{apps.map(([color, nw], i) => {
				const x = 16 + (i%3)*294, y = 68 + Math.floor(i/3)*86;
				return (
					<g key={i}>
						<rect x={x} y={y} width={278} height={74} rx={10} fill={W} stroke={B} />
						<rect x={x+16} y={y+13} width={40} height={40} rx={8} fill={color} opacity={0.12} />
						<rect x={x+24} y={y+21} width={24} height={24} rx={5} fill={color} />
						<rect x={x+68} y={y+17} width={nw} height={8} rx={4} fill={D} />
						<rect x={x+68} y={y+32} width={96} height={6} rx={3} fill={M} />
						<rect x={x+68} y={y+44} width={76} height={6} rx={3} fill={M} />
						<rect x={x+192} y={y+25} width={70} height={24} rx={7} fill={G} stroke={B} />
						<rect x={x+206} y={y+33} width={42} height={7} rx={3.5} fill={X} />
					</g>
				);
			})}
		</svg>
	);
}

export function SSOPreview() {
	const providers = [["#ea4335",60,true],["#0052cc",40,false],["#00a1f1",52,false],["#4a154b",48,false],["#1b1f23",56,false]] as const;
	const fields = [[78,180],[128,200],[178,160],[228,0]] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={220} height={288} rx={10} fill={W} stroke={B} />
			<rect x={32} y={32} width={60} height={8} rx={4} fill={D} />
			{providers.map(([color, lw, active], i) => (
				<g key={i}>
					<rect x={24} y={56+i*46} width={196} height={40} rx={8} fill={active?"#f5f3ff":"transparent"} stroke={active?"#c4b5fd":"transparent"} strokeWidth={1} />
					<rect x={36} y={66+i*46} width={24} height={24} rx={6} fill={color} opacity={0.85} />
					<rect x={68} y={70+i*46} width={lw} height={8} rx={4} fill={active?D:X} />
					<rect x={68} y={82+i*46} width={80} height={6} rx={3} fill={M} />
				</g>
			))}
			<rect x={248} y={16} width={636} height={288} rx={10} fill={W} stroke={B} />
			<rect x={264} y={32} width={120} height={10} rx={5} fill={D} />
			<rect x={264} y={50} width={200} height={7} rx={3.5} fill={M} />
			<rect x={724} y={28} width={48} height={26} rx={13} fill="#6366f1" />
			<circle cx={740} cy={41} r={10} fill={W} />
			{fields.map(([y, iw], i) => (
				<g key={y}>
					<rect x={264} y={y} width={[80,100,64,96][i]} height={7} rx={3.5} fill={D} />
					<rect x={264} y={y+14} width={600} height={i===3?52:32} rx={7} fill={S} stroke={B} />
					{iw > 0 && <rect x={280} y={y+22} width={iw} height={7} rx={3.5} fill={M} />}
				</g>
			))}
		</svg>
	);
}

export function SegmentsPreview() {
	const chips = [["#f5f3ff","#c4b5fd","#7c3aed",76],["#f0fdf4","#86efac","#15803d",88],["#fff7ed","#fed7aa","#c2410c",96]] as const;
	const rows = [["#6366f1",96,80],[" #22c55e",112,120],["#f59e0b",80,60],["#ec4899",104,100],["#0ea5e9",88,90]] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			{chips.map(([bg,bd,tx,w], i) => (
				<rect key={i} x={16+i*108} y={16} width={w} height={32} rx={16} fill={bg} stroke={bd} strokeWidth={1} />
			))}
			{chips.map(([,,tx,w], i) => (
				<rect key={i} x={32+i*108} y={25} width={w-32} height={7} rx={3.5} fill={tx} />
			))}
			<rect x={752} y={16} width={132} height={32} rx={8} fill="#6366f1" />
			<rect x={780} y={25} width={76} height={7} rx={3.5} fill={W} opacity={0.9} />
			<rect x={0} y={64} width={900} height={36} fill={S} />
			<line x1={0} y1={64} x2={900} y2={64} stroke={B} strokeWidth={1} />
			<line x1={0} y1={100} x2={900} y2={100} stroke={B} strokeWidth={1} />
			{[[16,72],[280,56],[480,48],[660,60],[820,40]].map(([x,w],i) => <rect key={i} x={x} y={78} width={w} height={7} rx={3.5} fill={X} />)}
			{rows.map(([color, nw, bar], i) => {
				const y = 100 + i*44;
				return (
					<g key={i}>
						<rect x={0} y={y} width={900} height={44} fill={i%2===0?W:"#fafafa"} />
						<line x1={0} y1={y+44} x2={900} y2={y+44} stroke={G} strokeWidth={1} />
						<circle cx={28} cy={y+22} r={8} fill={color} opacity={0.15} />
						<circle cx={28} cy={y+22} r={4} fill={color} />
						<rect x={48} y={y+18} width={nw} height={8} rx={4} fill={D} />
						<rect x={280} y={y+18} width={40} height={8} rx={4} fill={D} />
						<rect x={480} y={y+19} width={160} height={6} rx={3} fill={G} />
						<rect x={480} y={y+19} width={bar} height={6} rx={3} fill={color} opacity={0.4} />
						<rect x={660} y={y+18} width={56} height={8} rx={4} fill={D} />
						{[836,848,860].map(cx => <circle key={cx} cx={cx} cy={y+22} r={2.5} fill={M} />)}
					</g>
				);
			})}
		</svg>
	);
}

export function AuditLogPreview() {
	const events = [
		["#22c55e",80,140],["#6366f1",72,120],["#f59e0b",88,160],
		["#ec4899",76,136],["#ef4444",84,148],["#22c55e",68,128],
	] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={420} height={36} rx={8} fill={W} stroke={B} />
			<rect x={40} y={28} width={120} height={8} rx={4} fill={M} />
			<rect x={452} y={16} width={120} height={36} rx={8} fill={W} stroke={B} />
			<rect x={464} y={28} width={76} height={8} rx={4} fill={M} />
			<rect x={0} y={68} width={900} height={36} fill={S} />
			<line x1={0} y1={68} x2={900} y2={68} stroke={B} strokeWidth={1} />
			<line x1={0} y1={104} x2={900} y2={104} stroke={B} strokeWidth={1} />
			{[[16,24],[60,48],[200,56],[460,60],[700,44],[820,56]].map(([x,w],i) => <rect key={i} x={x} y={82} width={w} height={7} rx={3.5} fill={X} />)}
			{events.map(([icon,aw,acw], i) => {
				const y = 104 + i*36;
				return (
					<g key={i}>
						<rect x={0} y={y} width={900} height={36} fill={i%2===0?W:"#fafafa"} />
						<line x1={0} y1={y+36} x2={900} y2={y+36} stroke={G} strokeWidth={1} />
						<circle cx={28} cy={y+18} r={6} fill={icon} opacity={0.2} />
						<circle cx={28} cy={y+18} r={3} fill={icon} />
						<circle cx={68} cy={y+18} r={12} fill={B} />
						<rect x={88} y={y+14} width={aw} height={7} rx={3.5} fill={D} />
						<rect x={200} y={y+14} width={acw} height={7} rx={3.5} fill={X} />
						<rect x={460} y={y+11} width={88} height={16} rx={8} fill={G} />
						<rect x={472} y={y+15} width={64} height={7} rx={3.5} fill={X} />
						<rect x={700} y={y+14} width={80} height={7} rx={3.5} fill={M} />
						<rect x={820} y={y+14} width={64} height={7} rx={3.5} fill={M} />
					</g>
				);
			})}
		</svg>
	);
}

export function CustomRolesPreview() {
	const roles = ["#6366f1","#22c55e","#94a3b8","#f59e0b","#0ea5e9"] as const;
	const perms = [0,1,2,3,4,5];
	const checks = [[1,1,1,1,1,1],[1,1,1,1,0,0],[1,1,0,0,0,0],[0,0,0,1,0,0],[1,1,0,0,0,0]] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={220} height={288} rx={10} fill={W} stroke={B} />
			<rect x={32} y={32} width={60} height={8} rx={4} fill={D} />
			<rect x={164} y={28} width={56} height={22} rx={7} fill="#6366f1" />
			<rect x={174} y={35} width={36} height={7} rx={3.5} fill={W} />
			{roles.map((color, i) => (
				<g key={i}>
					<rect x={24} y={60+i*46} width={196} height={40} rx={8} fill={i===0?"#f5f3ff":"transparent"} stroke={i===0?"#c4b5fd":"transparent"} strokeWidth={1} />
					<rect x={36} y={70+i*46} width={20} height={20} rx={4} fill={color} opacity={0.15} />
					<rect x={40} y={74+i*46} width={12} height={12} rx={3} fill={color} />
					<rect x={66} y={73+i*46} width={[48,44,40,52,48][i]} height={8} rx={4} fill={i===0?D:X} />
					<rect x={66} y={85+i*46} width={[36,40,32,44,40][i]} height={6} rx={3} fill={M} />
				</g>
			))}
			<rect x={248} y={16} width={636} height={288} rx={10} fill={W} stroke={B} />
			<rect x={264} y={32} width={96} height={8} rx={4} fill={D} />
			<rect x={264} y={48} width={200} height={6} rx={3} fill={M} />
			{perms.map(i => <rect key={i} x={408+i*76} y={72} width={48} height={7} rx={3.5} fill={X} />)}
			{checks.map((row, ri) => (
				<g key={ri}>
					<rect x={248} y={92+ri*40} width={636} height={40} fill={ri%2===0?"#fafafa":W} />
					<line x1={248} y1={92+ri*40} x2={884} y2={92+ri*40} stroke={G} strokeWidth={1} />
					<rect x={264} y={106+ri*40} width={[48,44,40,52,48][ri]} height={7} rx={3.5} fill={D} />
					{row.map((on, ci) => (
						<g key={ci}>
							<rect x={408+ci*76+10} y={105+ri*40} width={18} height={18} rx={4} fill={on?"#6366f1":W} stroke={on?"#6366f1":B} strokeWidth={1.5} />
							{on===1 && <path d={`M${420+ci*76} ${115+ri*40}l4 4 7-7`} stroke={W} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />}
						</g>
					))}
				</g>
			))}
		</svg>
	);
}

export function BrandingPreview() {
	const colors = ["#6366f1","#f97316","#22c55e","#ef4444","#0ea5e9","#f59e0b"] as const;
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={420} height={288} rx={10} fill={W} stroke={B} />
			<rect x={32} y={32} width={64} height={8} rx={4} fill={D} />
			<rect x={32} y={52} width={144} height={80} rx={10} fill={S} stroke={B} strokeWidth={1} strokeDasharray="4 4" />
			<circle cx={104} cy={82} r={16} fill={B} />
			<rect x={86} y={106} width={36} height={6} rx={3} fill={M} />
			<rect x={32} y={150} width={72} height={7} rx={3.5} fill={D} />
			{colors.map((c, i) => (
				<g key={c}>
					<circle cx={44+i*36} cy={176} r={13} fill={c} />
					{i===0 && <circle cx={44} cy={176} r={9} fill="none" stroke={W} strokeWidth={2} />}
				</g>
			))}
			<rect x={32} y={204} width={56} height={7} rx={3.5} fill={D} />
			<rect x={32} y={220} width={360} height={36} rx={8} fill={S} stroke={B} />
			<rect x={48} y={234} width={80} height={8} rx={4} fill={D} />
			<rect x={32} y={272} width={180} height={7} rx={3.5} fill={D} />
			<rect x={356} y={268} width={40} height={20} rx={10} fill={B} />
			<circle cx={368} cy={278} r={8} fill={W} />
			<rect x={452} y={16} width={432} height={288} rx={10} fill="#0f172a" />
			<rect x={452} y={16} width={432} height={48} rx={10} fill="#1e293b" />
			<rect x={452} y={48} width={432} height={8} fill="#1e293b" />
			<circle cx={476} cy={36} r={5} fill="#ef4444" opacity={0.7} />
			<circle cx={494} cy={36} r={5} fill="#f59e0b" opacity={0.7} />
			<circle cx={512} cy={36} r={5} fill="#22c55e" opacity={0.7} />
			<rect x={528} y={28} width={240} height={16} rx={8} fill="#334155" />
			<rect x={544} y={33} width={120} height={6} rx={3} fill="#64748b" />
			<rect x={476} y={72} width={384} height={220} rx={4} fill={S} />
			<rect x={476} y={72} width={384} height={44} fill="#6366f1" />
			<rect x={500} y={84} width={80} height={10} rx={5} fill={W} opacity={0.9} />
			<rect x={500} y={100} width={120} height={6} rx={3} fill={W} opacity={0.4} />
			<rect x={492} y={128} width={352} height={60} rx={6} fill={W} stroke={B} />
			<rect x={508} y={140} width={96} height={8} rx={4} fill={D} />
			<rect x={508} y={156} width={200} height={6} rx={3} fill={M} />
			<rect x={508} y={168} width={160} height={6} rx={3} fill={M} />
		</svg>
	);
}

export function CustomDomainPreview() {
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={868} height={288} rx={10} fill={W} stroke={B} />
			<rect x={32} y={32} width={96} height={10} rx={5} fill={D} />
			<rect x={32} y={52} width={240} height={7} rx={3.5} fill={M} />
			<rect x={32} y={76} width={72} height={7} rx={3.5} fill={D} />
			<rect x={32} y={92} width={680} height={40} rx={8} fill={S} stroke={B} />
			<rect x={32} y={92} width={72} height={40} rx={8} fill={G} />
			<rect x={40} y={107} width={56} height={8} rx={4} fill={X} />
			<rect x={116} y={107} width={180} height={8} rx={4} fill={M} />
			<rect x={728} y={92} width={120} height={40} rx={8} fill={D} />
			<rect x={748} y={107} width={80} height={8} rx={4} fill={W} />
			<line x1={32} y1={152} x2={868} y2={152} stroke={G} strokeWidth={1} />
			<rect x={32} y={164} width={64} height={8} rx={4} fill={D} />
			<rect x={32} y={184} width={200} height={40} rx={8} fill="#f0fdf4" stroke="#bbf7d0" />
			<circle cx={52} cy={204} r={8} fill="#22c55e" opacity={0.2} />
			<circle cx={52} cy={204} r={4} fill="#22c55e" />
			<rect x={68} y={198} width={64} height={8} rx={4} fill="#15803d" />
			<rect x={68} y={210} width={100} height={6} rx={3} fill="#86efac" />
			<rect x={252} y={184} width={616} height={40} rx={8} fill={S} stroke={B} />
			<rect x={268} y={199} width={32} height={10} rx={5} fill="#6366f1" opacity={0.2} />
			<rect x={284} y={201} width={24} height={6} rx={3} fill="#6366f1" />
			<rect x={320} y={199} width={200} height={10} rx={5} fill={M} />
			<rect x={600} y={199} width={200} height={10} rx={5} fill={M} />
			<rect x={32} y={240} width={64} height={8} rx={4} fill={D} />
			{[[32,80],[128,36],[200,240],[508,280]].map(([x,w],i) => (
				<rect key={i} x={x} y={264} width={w} height={28} rx={6} fill={i===0?G:S} stroke={i===0?"transparent":B} />
			))}
			<rect x={44} y={275} width={56} height={6} rx={3} fill={X} />
			<rect x={140} y={275} width={24} height={6} rx={3} fill={M} />
			<rect x={212} y={275} width={180} height={6} rx={3} fill={M} />
			<rect x={520} y={275} width={200} height={6} rx={3} fill={M} />
		</svg>
	);
}

function GenericPreview() {
	return (
		<svg {...svgProps}>
			<rect width="900" height="320" fill={S} />
			<rect x={16} y={16} width={868} height={288} rx={10} fill={W} stroke={B} />
			{[0,1,2,3,4].map(i => (
				<g key={i}>
					<rect x={32} y={48+i*48} width={[180,240,160,200,140][i]} height={i===0?12:8} rx={i===0?6:4} fill={i===0?D:M} />
					{i>0 && <rect x={32} y={64+i*48} width={[280,240,300,260][i-1]} height={7} rx={3.5} fill={B} />}
				</g>
			))}
		</svg>
	);
}

type GatedFeature = "analytics"|"customDomain"|"sso"|"hidePoweredBy"|"segments"|"auditLog"|"integrations"|"webhooks"|"apiTokens"|"oauthClients"|"customRoles"|"savedViews"|"privateBoards"|"guestPosting"|"boards"|"team";

export const FEATURE_PREVIEWS: Partial<Record<GatedFeature, ()=>React.JSX.Element>> = {
	analytics: AnalyticsPreview,
	team: TeamPreview,
	integrations: IntegrationsPreview,
	sso: SSOPreview,
	segments: SegmentsPreview,
	auditLog: AuditLogPreview,
	customRoles: CustomRolesPreview,
	hidePoweredBy: BrandingPreview,
	customDomain: CustomDomainPreview,
};

export { GenericPreview };
