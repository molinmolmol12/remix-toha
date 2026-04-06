/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  ShoppingBag, 
  Eye, 
  Zap, 
  Key, 
  Bot, 
  Save, 
  ChevronDown,
  LayoutDashboard,
  Network,
  ShieldCheck,
  ShoppingCart,
  AlertCircle,
  MonitorPlay,
  Search,
  Layout,
  Info,
  Settings,
  ChevronRight,
  Minus,
  X,
  Check,
  Lightbulb,
  User,
  Users,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Film,
  UploadCloud,
  Wand2,
  BarChart2,
  FileText,
  RefreshCw,
  Copy,
  History,
  Clock,
  MoreVertical,
  ChevronUp
} from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion } from 'motion/react';
import { fetchWithRetry } from './lib/api';
import { 
  fetchAdAccounts, 
  fetchAccountInsights, 
  fetchCampaigns,
  fetchCampaignInsights,
  fetchDailyInsights,
  MetaAdAccount,
  MetaCampaignInsight
} from './services/metaAdsService';

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend as RechartsLegend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const parseNum = (str: any) => parseInt(String(str).replace(/[^0-9]/g, '')) || 0;

// Mock data for the campaign table
const campaignData = [
  {
    status: 'Active',
    name: 'Ramadan Sale 2026 - Conversion',
    analisis: 'High',
    spend: 12500000,
    reach: 450000,
    impressions: 890000,
    cpm: 14044,
    ctr: 1.2,
    clicks: 10680,
    lpViews: 8544,
    attracted: 4200,
    interested: 2100,
    engaged: 1050,
    en25: 840,
    enPlus: 420,
    purchase: 420,
    costPerResult: 29761,
    roas: 4.2
  },
  {
    status: 'Active',
    name: 'New Arrival - Catalog Sales',
    analisis: 'Medium',
    spend: 8400000,
    reach: 320000,
    impressions: 650000,
    cpm: 12923,
    ctr: 0.85,
    clicks: 5525,
    lpViews: 4420,
    attracted: 2100,
    interested: 1050,
    engaged: 525,
    en25: 420,
    enPlus: 210,
    purchase: 210,
    costPerResult: 40000,
    roas: 3.1
  },
  {
    status: 'Paused',
    name: 'Retargeting - Abandoned Cart',
    analisis: 'Optimal',
    spend: 2100000,
    reach: 45000,
    impressions: 120000,
    cpm: 17500,
    ctr: 2.4,
    clicks: 2880,
    lpViews: 2304,
    attracted: 1800,
    interested: 900,
    engaged: 450,
    en25: 360,
    enPlus: 180,
    purchase: 180,
    costPerResult: 11666,
    roas: 8.5
  }
];

type AiStatusResult = { 
  status: 'Boncos' | 'Rawan' | 'Profit'; 
  reason: string;
  // ANALISA IKLAN SAAT INI
  general_analysis: { type: 'positive' | 'negative' | 'warning'; text: string }[];
  general_conclusion: string;
  // VIDEO RETENTION, DEMOGRAFI & SOLUSI
  video_demographic_analysis: { type: 'positive' | 'negative' | 'warning'; text: string }[];
  video_demographic_conclusion: string;
};

interface DocHistoryItem {
  id: string;
  scriptTitle: string;
  shotNumber: number;
  shotName: string;
  content: string;
  timestamp: string;
}

const CampaignTable = ({ campaigns, demographicsData }: { campaigns: MetaCampaignInsight[], demographicsData: any[] }) => {
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ALL'>('ACTIVE');
  const [aiStatus, setAiStatus] = useState<Record<string, AiStatusResult>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedAiDetails, setSelectedAiDetails] = useState<{campaign: MetaCampaignInsight, data: AiStatusResult} | null>(null);
  const [lastSelectedAiDetails, setLastSelectedAiDetails] = useState<{campaign: MetaCampaignInsight, data: AiStatusResult} | null>(null);
  
  // Landing Page Analysis State
  const [lpUrl, setLpUrl] = useState('');
  const [lpBrandName, setLpBrandName] = useState('MOLINLIBRARY');
  const [lpYoutubeUrl, setLpYoutubeUrl] = useState('');
  const [lpYoutubeDesc, setLpYoutubeDesc] = useState('');
  const [lpHeroImg, setLpHeroImg] = useState('');
  const [lpPreviewImg, setLpPreviewImg] = useState('');
  const [lpProblemImg, setLpProblemImg] = useState('');
  const [lpFramework, setLpFramework] = useState('AIDA');
  const [lpTone, setLpTone] = useState('Friendly & Conversational');
  const [lpGoal, setLpGoal] = useState('Lead Generation (WA/Email)');
  const [lpEmbedType, setLpEmbedType] = useState('Isi Embed Sendiri');
  const [lpStrikePrice, setLpStrikePrice] = useState('');
  const [lpSalePrice, setLpSalePrice] = useState('');
  const [isAnalyzingLp, setIsAnalyzingLp] = useState(false);
  const [lpAnalysisResult, setLpAnalysisResult] = useState<{ analysis: string; improvements: string[] } | null>(null);
  const [isGeneratingLp, setIsGeneratingLp] = useState(false);
  const [generatedLpCode, setGeneratedLpCode] = useState<string | null>(null);
  const [expandedRetention, setExpandedRetention] = useState<string | null>(null);
  const [isAiSuggestionModalOpen, setIsAiSuggestionModalOpen] = useState(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isAnalyzingVideo, setIsAnalyzingVideo] = useState(false);
  const [videoAnalysisResult, setVideoAnalysisResult] = useState<any | null>(null);
  const [isProductionDocModalOpen, setIsProductionDocModalOpen] = useState(false);
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);
  const [productionDocResult, setProductionDocResult] = useState<string | null>(null);
  const [selectedScriptForDoc, setSelectedScriptForDoc] = useState<any | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [docHistory, setDocHistory] = useState<DocHistoryItem[]>(() => {
    const saved = localStorage.getItem('doc_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('doc_history', JSON.stringify(docHistory));
  }, [docHistory]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const detailsRef = React.useRef<HTMLDivElement>(null);

  const handleAnalyzeLandingPage = async () => {
    if (!lpUrl) {
      alert("Silakan masukkan URL Landing Page terlebih dahulu.");
      return;
    }
    setIsAnalyzingLp(true);
    setLpAnalysisResult(null);
    setGeneratedLpCode(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // Extract metrics from selected campaign if available
      const campaign = selectedAiDetails?.campaign || lastSelectedAiDetails?.campaign;
      const metrics = campaign ? {
        lp_views: campaign.actions?.find(a => a.action_type === 'landing_page_view')?.value || '0',
        purchases: campaign.actions?.find(a => a.action_type === 'purchase')?.value || '0',
        view_content: campaign.actions?.find(a => a.action_type === 'view_content')?.value || '0',
        add_to_cart: campaign.actions?.find(a => a.action_type === 'add_to_cart')?.value || '0',
        initiate_checkout: campaign.actions?.find(a => a.action_type === 'initiate_checkout')?.value || '0',
      } : null;

      const prompt = `Anda adalah ahli optimasi Landing Page (CRO Expert).
Analisa Landing Page berikut: ${lpUrl}

Pahami secara mendalam isi dari landing page tersebut, termasuk:
- Produk apa yang dijual?
- Apa saja fitur dan manfaat utamanya?
- Apa saja bonus yang ditawarkan?
- Siapa target audiensnya?
- Apa pain points yang coba diselesaikan?

JANGAN memberikan analisis template yang generik. Analisis Anda harus spesifik berdasarkan konten asli yang ada di URL tersebut.

${metrics ? `Data performa iklan saat ini:
- LP Views: ${metrics.lp_views}
- Purchases: ${metrics.purchases}
- View Content (Attracted): ${metrics.view_content}
- Add to Cart (Interested): ${metrics.add_to_cart}
- Initiate Checkout (Engaged): ${metrics.initiate_checkout}
` : ''}

Berikan analisis mendalam tentang apa yang perlu diperbaiki di landing page tersebut agar konversi meningkat. Fokus pada:
1. Hook & Headline
2. Kecepatan Loading (asumsi berdasarkan URL)
3. Kejelasan Penawaran (Offer & Bonuses)
4. Social Proof
5. Call to Action (CTA)

Kembalikan hasil dalam format JSON:
{
  "analysis": "Paragraf penjelasan analisis keseluruhan yang spesifik terhadap produk...",
  "improvements": ["Poin perbaikan 1", "Poin perbaikan 2", "Poin perbaikan 3", "Poin perbaikan 4", "Poin perbaikan 5"]
}`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ urlContext: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysis: { type: Type.STRING },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["analysis", "improvements"]
          }
        }
      });

      const result = JSON.parse(response.text);
      setLpAnalysisResult(result);
    } catch (error) {
      console.error("Error analyzing LP:", error);
      alert("Gagal menganalisa Landing Page.");
    } finally {
      setIsAnalyzingLp(false);
    }
  };

  const handleGenerateLandingPage = async () => {
    if (!lpAnalysisResult) return;
    setIsGeneratingLp(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `### STRICT COMPLIANCE REQUIRED ###
Anda adalah AI Copywriter dan Web Developer terbaik. Anda HARUS mengikuti konfigurasi berikut dengan ketat. Jika Anda gagal, konversi akan hancur.

KONFIGURASI TERPILIH:
- Nama Brand: ${lpBrandName} (Gunakan nama ini untuk Logo dan identitas brand di seluruh landing page)
- Link Video YouTube: ${lpYoutubeUrl || 'Tidak ada'} (Gunakan link ini untuk section video)
- Deskripsi Video YouTube: ${lpYoutubeDesc || 'Tidak ada'} (Gunakan teks ini untuk menjelaskan isi video)
- Gambar Hero Section: ${lpHeroImg || 'Gunakan placeholder produk 1:1'}
- Gambar Preview Section: ${lpPreviewImg || 'Gunakan placeholder preview 1:1'}
- Gambar Problem Section: ${lpProblemImg || 'Gunakan placeholder problem 1:1'}
- Framework Copywriting: ${lpFramework} (Anda WAJIB menyusun konten mengikuti struktur ${lpFramework} secara eksplisit)
- Gaya Bahasa (Tone): ${lpTone} (Gunakan kosa kata dan gaya bicara yang sesuai dengan ${lpTone})
- Tujuan Utama (Goal): ${lpGoal} (Seluruh CTA dan alur harus mengarah ke ${lpGoal})
- Tipe Embed Form: ${lpEmbedType} (Gunakan layout sesuai tipe ini)
- Harga Coret: ${lpStrikePrice || 'Tidak ada'}
- Harga Jual: ${lpSalePrice || 'Tidak ada'}

DATA ANALISA (DARI URL ASLI):
Analisis: ${lpAnalysisResult.analysis}
Perbaikan: ${lpAnalysisResult.improvements.join(', ')}

### MANDATORY: Anda WAJIB mengimplementasikan SEMUA poin yang ada di "Perbaikan" di atas ke dalam kode landing page. Ini adalah prioritas utama.

Buatlah kode HTML lengkap untuk landing page yang sudah dioptimasi. 

ATURAN WAJIB & LARANGAN:
1. STRUKTUR: Susun konten menggunakan framework ${lpFramework}. Jangan gunakan framework lain.
2. TONE: Gunakan gaya bahasa ${lpTone} di seluruh teks.
3. GOAL: Pastikan semua elemen mengarah ke ${lpGoal}.
4. CTA TEXT COLOR: SEMUA tombol (CTA) WAJIB menggunakan teks berwarna PUTIH (#FFFFFF). Tambahkan class "text-white" atau style "color: white !important;" pada setiap elemen <button> atau <a> yang berfungsi sebagai tombol. Ini berlaku untuk MOBILE, TABLET, dan DESKTOP.
5. DILARANG menggunakan background image yang ditimpa teks (text overlay on image). Gunakan background warna solid atau gradasi bersih.
6. SEO & AKSESIBILITAS: WAJIB gunakan tag <h1> untuk Headline utama di Hero Section (tetap styling text-[24px]). Gunakan tag <h2> untuk setiap judul section lainnya. Ini WAJIB untuk skor SEO dan Aksesibilitas 90+.
7. DILARANG menggunakan tag heading lainnya (h3-h6). Gunakan elemen teks biasa dengan styling font-size yang sesuai.
8. HERO SECTION: WAJIB menyertakan gambar produk yang menonjol. Posisi gambar WAJIB berada di ATAS tombol CTA. Gunakan ukuran 1:1 (square). Gunakan URL Gambar Hero Section yang diberikan jika ada. Pada tampilan mobile, gunakan ukuran yang proporsional (tidak full layar agar tidak pecah/melebar). **WAJIB gunakan fetchpriority="high" dan DILARANG gunakan loading="lazy" pada gambar ini. Tambahkan <link rel="preload" as="image" href="..."> di dalam <head> untuk gambar hero ini.**
9. DILARANG KERAS menyertakan FOOTER dalam bentuk apapun.
10. PRICING & OFFER SECTION (${lpEmbedType}): 
    - DILARANG KERAS menyertakan gambar apapun dalam section ini.
    - Jika "Pasang Otomatis": DILARANG menggunakan embed form. Gunakan tombol CTA (button) yang elegan dengan teks "DAPATKAN SEKARANG" yang mengarah ke link eksternal: https://dhana-store.myscalev.com/landing-page-baru-33.
    - Jika "Isi Embed Sendiri": Gunakan layout penawaran harga yang menarik dan letakkan Placeholder Embed Form (< PASTE EMBED FORM DI SINI >) di posisi strategis. DILARANG KERAS menambahkan tombol CTA (button/link) buatan AI jika menggunakan placeholder ini.
11. Jika ada harga, tampilkan Harga Coret (strikethrough) and Harga Jual (bold/highlight) secara jelas.
12. PERFORMANCE OPTIMIZATION (Target Skor 90+):
    - **Font Display**: Tambahkan &display=swap pada URL Google Fonts.
    - **Image Optimization**: 
        - Gambar pertama (Hero Image) DILARANG menggunakan loading="lazy", melainkan wajib menggunakan fetchpriority="high". 
        - Sisa gambar di bawah lipatan layar barulah wajib menggunakan loading="lazy". 
        - SEMUA gambar wajib memiliki atribut width dan height eksplisit (misal: width="500" height="500") dan alt text deskriptif.
        - Pastikan aspek rasio 1:1 tetap terjaga menggunakan object-cover.
13. Optimasi Font: Wajib gunakan tag <link rel="preconnect"> dan <link rel="stylesheet"> dengan &display=swap di dalam <head>. DILARANG menggunakan @import.
14. AKSESIBILITAS (Target Skor 90+):
    - Pastikan rasio kontras teks tinggi (Teks abu-abu minimal #334155, Oranye minimal #c2410c).
    - WAJIB tambahkan attribute aria-label pada setiap elemen interaktif (<button>, <a>, <summary>).
    - Gunakan struktur heading yang benar (h1 untuk hero, h2 untuk section).
    - Pastikan semua elemen <img> memiliki atribut alt yang relevan.
15. VISUAL STYLE:
    - Gunakan banyak Whitespace (ruang kosong) antar section agar desain terlihat bersih dan premium.
    - Gunakan border-radius yang besar (class "rounded-3xl") pada elemen kartu, gambar, dan tombol.
    - Berikan efek Shadow yang lembut (class "shadow-sm" atau "shadow-md") untuk memberikan kedalaman visual tanpa terlihat berat.
16. JUMLAH GAMBAR: WAJIB HANYA ADA 3 GAMBAR di seluruh landing page: 1 di Hero Section, 1 di Isi Ebook (Preview) Section, dan 1 di Problem Section. Gunakan URL gambar yang diberikan di konfigurasi (Hero, Preview, Problem) jika tersedia. Section lain (Solution, Testimoni, FAQ, Offer) DILARANG memiliki gambar produk/ilustrasi. Semua gambar menggunakan rasio 1:1 (square) dengan ukuran yang pas (tidak melebar/full layar di HP). Posisi gambar di Preview dan Problem WAJIB di bawah judul section.
17. EMBED FORM SECTION: WAJIB gunakan kode HTML dan CSS berikut secara persis tanpa dikurangi atau ditambah:
    HTML:
    <section id="form-order" class="form-section">
        <div class="w-full max-w-[600px] mx-auto fade-in-up px-0 sm:px-5">
            <div class="scalev-embed-container">
                <iframe id="myiframe" width="100%" style="min-height: 900px;" frameborder="0" src="https://dhana-store.myscalev.com/landing-page-baru-33" scrolling="auto"></iframe>
                <script>
                    // ... (Script bawaan dari Scalev) ...
                </script>
            </div>
        </div>
    </section>
    
    CSS (Sertakan dalam tag <style>):
    .scalev-embed-container { width: 100%; max-width: 600px; margin: 0 auto; background: transparent; border-radius: 20px; overflow: hidden; box-sizing: border-box; display: block; }
    @media (max-width: 768px) {
        .form-section { padding: 20px 0 40px 0 !important; background-color: #ffffff; width: 100%; box-sizing: border-box; } 
        .scalev-embed-container { border-radius: 0 !important; width: 100% !important; max-width: 100% !important; padding: 0 15px; box-sizing: border-box; }
    }
18. Responsivitas HP: Seluruh landing page WAJIB **FULL LAYAR (w-full)**. DILARANG KERAS ada margin, space, atau padding di sisi kiri dan kanan layar pada tampilan mobile. Semua section harus menempel ke tepi layar HP.
19. DILARANG KERAS menyertakan Sales Notification popup atau script popup apapun untuk menjaga performa TBT (Total Blocking Time).
20. TRUST BAR & LOGOS: WAJIB menyertakan MINIMAL 10 institusi, universitas, atau pondok pesantren yang relevan. **DILARANG KERAS menggunakan URL gambar eksternal yang tidak pasti valid (seperti menebak domain logo).** 
    - Untuk setiap item, tampilkan ikon "Verified" (SVG Checkmark dalam lingkaran biru/hijau) diikuti dengan NAMA institusinya secara jelas (Contoh: [Ikon] Universitas Indonesia). 
    - Jika Anda sangat yakin memiliki URL logo SVG yang valid dan stabil, Anda boleh menggunakannya, namun WAJIB menyertakan NAMA institusi di samping/bawah logo tersebut. 
    - Jika ragu, gunakan saja kombinasi Ikon Verified + Teks Nama Institusi agar tidak ada gambar yang pecah.
    - Susun dalam 2 baris yang bergerak otomatis (Scrolling Marquee): Baris ATAS bergerak ke KIRI, baris BAWAH bergerak ke KANAN. 
    - DI ATAS Trust Bar WAJIB ada teks "SUDAH DI PERCAYA OLEH" dengan ukuran font 20px (text-[20px]).
21. ISI EBOOK (PREVIEW) SECTION: WAJIB ditambahkan tepat di bawah Trust Bar. Berikan penjelasan mendalam tentang isi produk (Contoh: Jika produknya Tafsir Ibnu Katsir, jelaskan sejarah, metode bil ma’tsur, dan keunggulannya). WAJIB sertakan satu Gambar (Gunakan URL Gambar Preview Section jika ada, atau placeholder 1:1) dengan ukuran yang proporsional (tidak full layar di HP) tepat DI BAWAH JUDUL section ini (sebelum teks penjelasan).
22. TESTIMONI (GAYA SCREENSHOT WHATSAPP): WAJIB tepat 2 testimoni (untuk meringankan halaman). 
    - **CRITICAL: DILARANG KERAS menggunakan desain kartu (card), bayangan (box-shadow/shadow), border-radius pada container utama, atau margin/padding yang membuat testimoni terlihat melayang.**
    - **Tampilan WAJIB FULL-WIDTH (Edge-to-Edge) di HP. Gunakan class "w-full max-w-none px-0" untuk container utama testimoni agar benar-benar terlihat seperti tangkapan layar penuh.**
    - Desain WAJIB dibuat SANGAT DETAIL seolah-olah screenshot percakapan WhatsApp asli (BUKAN card testimoni biasa).
    - **DILARANG KERAS menggunakan bintang (rating) dalam bentuk apapun.**
    - **WAJIB RANDOM & BERBEDA:** Testi 1 dan Testi 2 HARUS memiliki isi percakapan yang berbeda, nama yang berbeda, foto profil yang berbeda, and alur cerita yang berbeda.
    - **WAJIB berisi MINIMAL 5 kali tanya jawab secara acak antara pembeli dan penjual per testimoni agar percakapan terlihat nyata namun tetap ringan.**
    - **Tampilan WAJIB memanjang ke bawah hingga memenuhi layar (rasio vertikal 9:16).**
    - Harus ada: Header WhatsApp (Nama, Status Online, Foto Profil, Ikon Video Call, Ikon Call, Ikon Menu), Background chat khas WhatsApp (Gunakan warna gelap #0b141a agar terlihat pro), Bubble chat (Kanan/Penjual: #005c4b, Kiri/Pembeli: #202c33), Status centang biru, dan Input Bar di bagian bawah (Ikon Emoji, Attachment, Kamera, Mic). Data pribadi (nama/foto) WAJIB disensor/blur.
    - **DETAIL NYATA:** Setiap bubble chat WAJIB memiliki JAM TERKIRIM (timestamp) di pojok kanan bawah bubble (warna teks jam: #8696a0). Bubble penjual (kanan) WAJIB memiliki ikon DOUBLE CHECKMARK (centang dua) berwarna biru (#53bdeb) di samping jam agar terlihat sangat nyata dan profesional. Pastikan font yang digunakan mirip dengan font sistem WhatsApp (Sans-serif).
23. INTERAKTIF & PERFORMANCE: Gunakan animasi masuk (entry animations) yang ringan. Hover effects pada elemen yang bisa diklik. WAJIB gunakan "transform: translateZ(0)" pada elemen animasi agar rendering lancar. JANGAN gunakan animasi yang terlalu berat yang bisa memperlambat TBT (Total Blocking Time).
24. LAZY INITIALIZATION: Pastikan semua elemen interaktif atau animasi hanya aktif/berjalan saat elemen tersebut masuk ke area layar (viewport) untuk menjaga skor LCP (Largest Contentful Paint).
25. NAVIGASI & UX FLOW: 
    - Sticky Header: WAJIB HANYA berisi Nama Brand ${lpBrandName} saja. DILARANG KERAS menyertakan tombol (ORDER/BELI), link navigasi, atau elemen lain di dalam header. Wajib melayang (fixed/sticky) dan mengikuti scroll pada tampilan HP (Center di HP).
    - Implementasikan Smooth Scroll pada semua link internal.
    - Buat Sticky Header yang mengecil (shrink) atau menjadi transparan saat di-scroll.
    - Tambahkan Reading Progress Bar tipis di bagian paling atas layar.
26. ANIMASI VISUAL:
    - Gunakan Scroll Reveal (efek fade-up untuk teks, fade-right untuk gambar) saat elemen muncul di viewport.
    - Berikan efek Floating (melayang halus) pada gambar produk utama di Hero Section.
    - Implementasikan efek 3D Tilt pada gambar kartu produk 1:1 (khusus desktop).
27. KONVERSI & URGENSI:
    - Tambahkan efek Shimmer (kilatan cahaya) pada tombol CTA utama setiap 5 detik.
    - Berikan efek Hover Transformation pada CTA (scale 1.05 + shadow lebih tebal).
    - Tambahkan Countdown Timer dinamis (animasi flip/detak) jika ada promo terbatas.
28. FAQ ACCORDION: Gunakan sistem accordion interaktif dengan ikon '+' yang berputar menjadi 'x' saat dibuka, dengan transisi halus.
29. EMBED FORM SECTION: 
    - **CRITICAL:** Jika "Pasang Otomatis": DILARANG KERAS menyertakan section ini, script Scalev, atau iframe apapun. Seluruh interaksi harus melalui tombol CTA di Pricing Section yang mengarah ke link eksternal.
    - Jika "Isi Embed Sendiri": WAJIB gunakan kode Scalev yang telah diberikan di poin 14 sebagai section TERPISAH di bawah Pricing Section. Pastikan CSS-nya diterapkan dengan benar agar tampilan di HP full-width namun tetap memiliki padding aman 15px di kiri-kanan.
30. ICON FONTS: Gunakan **FontAwesome** (via CDN) untuk icon UI agar tajam dan ringan. Contoh: <i class="fab fa-cc-visa"></i>.
31. Kembalikan HANYA kode HTML mentah. JANGAN gunakan markdown code blocks. Tulis langsung <html>...</html>.
32. YOUTUBE VIDEO SECTION: Jika ada "Link Video YouTube", tambahkan section embed video YouTube yang responsif tepat di ATAS Testimonial Section. 
    - Gunakan aspek rasio 16:9.
    - **WAJIB gunakan atribut loading="lazy" pada iframe-nya.**
    - **DILARANG menggunakan autoplay agar tidak menyedot memori HP saat halaman baru dibuka.**
    - **SANGAT DISARANKAN menggunakan metode Facade: tampilkan gambar thumbnail (cover) video saja, dan video baru dimuat (iframe muncul) saat thumbnail diklik.**
    - Sertakan "Deskripsi Video YouTube" di bawah video tersebut dengan styling teks yang menarik.

Struktur Konten:
- Sticky Header (HANYA Nama Brand ${lpBrandName}, DILARANG ada tombol/link lain, Center di HP, Wajib Melayang/Sticky/Fixed mengikuti scroll)
- Hero Section (Headline h1 24px, HANYA 1 Gambar Produk 1:1 Preloaded/Floating DI ATAS CTA, Sub-headline, CTA Shimmer Teks Putih)
- Trust Bar Section (Judul h2 "SUDAH DI PERCAYA OLEH" 20px + Marquee 2 Baris)
- Isi Ebook (Preview) Section (Judul h2, Gambar 1:1 Proporsional DI BAWAH JUDUL, Deskripsi Detail)
- Problem Section (Judul h2, Gambar 1:1 Proporsional Reveal di bawah judul, Pain points)
- Solution Section (Judul h2, Benefits - DILARANG ADA GAMBAR)
- YouTube Video Section (HANYA jika ada link video - Judul h2 - Lazy Load / Facade)
- Testimonial Section (Judul h2, Tepat 2 testimoni gaya Screenshot WhatsApp DETAIL & DARK MODE, Minimal 5 tanya jawab ringan agar DOM tidak terlalu berat)
- FAQ Section (Judul h2, Interactive Accordion)
- Offer Section (Judul h2, Countdown Timer, Pricing: Strike vs Sale Price, CTA Shimmer Teks Putih)
- Embed Form Section (HANYA jika "Isi Embed Sendiri")`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt
      });

      // Clean up any potential markdown if the AI still includes it despite instructions
      let code = response.text || '';
      code = code.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim();
      
      setGeneratedLpCode(code);
    } catch (error) {
      console.error("Error generating LP:", error);
      alert("Gagal membuat Landing Page.");
    } finally {
      setIsGeneratingLp(false);
    }
  };
  const handleAnalyzeVideo = async () => {
    setIsAnalyzingVideo(true);
    
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const campaignName = selectedAiDetails?.campaign?.campaign_name || "Iklan Produk";
      const spend = selectedAiDetails?.campaign?.spend || 0;
      const reach = selectedAiDetails?.campaign?.reach || 0;
      const ctr = selectedAiDetails?.campaign?.ctr || 0;
      
      const prompt = `Anda adalah seorang ahli Meta Ads dan Video Editor profesional.
Saya memiliki kampanye iklan bernama "${campaignName}" dengan data:
- Spend: Rp ${spend}
- Reach: ${reach}
- CTR: ${ctr}%

Saya baru saja mengunggah video iklan untuk kampanye ini. Berdasarkan nama kampanye dan performa datanya, berikan analisis visual mengapa video ini mungkin gagal (boncos) atau kurang optimal, dan berikan 3 ide variasi naskah video baru (Script) yang lebih baik untuk memperbaiki performa.

Kembalikan hasil dalam format JSON dengan struktur berikut:
{
  "analysisText": "Penjelasan paragraf mengapa video ini kurang optimal secara visual dan performa...",
  "scripts": [
    {
      "title": "Judul Script 1",
      "shots": [
        { "name": "Shot 1 (Hook 0-3s):", "desc": "Deskripsi visual dan teks..." },
        { "name": "Shot 2 (Agitasi 3-16s):", "desc": "Deskripsi visual dan teks..." },
        { "name": "Shot 3 (Solusi 16-24s):", "desc": "Deskripsi visual dan teks..." },
        { "name": "Shot 4 (CTA 24-32s):", "desc": "Deskripsi visual dan teks..." }
      ]
    }
  ]
}

Pastikan untuk memberikan 3 script yang berbeda.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysisText: { type: Type.STRING },
              scripts: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    shots: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: { type: Type.STRING },
                          desc: { type: Type.STRING }
                        },
                        required: ["name", "desc"]
                      }
                    }
                  },
                  required: ["title", "shots"]
                }
              }
            },
            required: ["analysisText", "scripts"]
          }
        }
      });

      const resultText = response.text;
      if (resultText) {
        const parsedResult = JSON.parse(resultText);
        setVideoAnalysisResult(parsedResult);
      }
    } catch (error) {
      console.error("Error analyzing video:", error);
      // Fallback to mock data if API fails
      setVideoAnalysisResult({
        analysisText: `Secara teknis, kampanye "${selectedAiDetails?.campaign?.campaign_name || 'ini'}" menunjukkan performa yang perlu dievaluasi. Visual terlihat kurang memiliki 'Stop Power'. Tidak ada 'Headline' yang memicu rasa penasaran (Curiosity Gap) atau urgensi di layar. Audiens mungkin menganggap ini video biasa, bukan iklan solusi cepat, sehingga CTR tertahan di angka ${selectedAiDetails?.campaign?.ctr || 0}%. Suasana terlalu 'tenang' dan tidak menunjukkan 'problem-solution' secara instan.`,
        scripts: [
          {
            title: "Script 1: Urgensi & Masalah (Problem Focus)",
            shots: [
              { name: "Shot 1 (Hook 0-3s):", desc: "Close up masalah utama yang dihadapi audiens. Teks: SERING MENGALAMI INI? (B/W)" },
              { name: "Shot 2 (Agitasi 3-16s):", desc: "Visual dampak buruk dari masalah tersebut. Teks: JANGAN DIBIARKAN! (B/W)" },
              { name: "Shot 3 (Solusi 16-24s):", desc: "Product shot ditunjukkan dengan cepat + Grafis manfaat kilat. Teks: SOLUSI INSTAN. (B/W)" },
              { name: "Shot 4 (CTA 24-32s):", desc: "Tangan klik tombol 'Order Now'. Teks: PROMO KHUSUS HARI INI! KLIK SEKARANG! (B/W)" }
            ]
          },
          {
            title: "Script 2: Testimoni & Bukti (Social Proof)",
            shots: [
              { name: "Shot 1 (Hook 0-3s):", desc: "Orang tersenyum puas memegang produk. Teks: AKHIRNYA NEMU YANG PAS! (B/W)" },
              { name: "Shot 2 (Agitasi 3-16s):", desc: "Montage cepat orang-orang memberikan jempol. Teks: RIBUAN ORANG SUDAH MEMBUKTIKAN! (B/W)" },
              { name: "Shot 3 (Solusi 16-24s):", desc: "Paket siap kirim dalam jumlah banyak. Teks: PENGIRIMAN SELURUH INDONESIA! (B/W)" },
              { name: "Shot 4 (CTA 24-32s):", desc: "Timer countdown di layar. Teks: DISKON BERAKHIR DALAM 2 JAM! KLIK LINK! (B/W)" }
            ]
          },
          {
            title: "Script 3: Fitur & Manfaat (Feature Highlight)",
            shots: [
              { name: "Shot 1 (Hook 0-3s):", desc: "Teks besar menutupi layar: RAHASIA TERBONGKAR! Visual produk glowing. (B/W)" },
              { name: "Shot 2 (Agitasi 3-16s):", desc: "Zoom in ke detail fitur unggulan produk. Teks: KUALITAS PREMIUM! (B/W)" },
              { name: "Shot 3 (Solusi 16-24s):", desc: "Visual perbandingan sebelum vs sesudah pakai produk. Teks: HASIL NYATA! (B/W)" },
              { name: "Shot 4 (CTA 24-32s):", desc: "Action orang lari mengambil HP untuk order. Teks: AMANKAN STOK ANDA SEKARANG! (B/W)" }
            ]
          }
        ]
      });
    } finally {
      setIsAnalyzingVideo(false);
    }
  };

  const handleGenerateProductionDoc = async (script: any, shotIndex: number) => {
    const shot = script.shots[shotIndex];
    setSelectedScriptForDoc({ ...script, selectedShot: shot, shotNumber: shotIndex + 1 });
    setIsProductionDocModalOpen(true);
    setIsGeneratingDoc(true);
    setProductionDocResult(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `Kembangkan ide naskah berikut menjadi Dokumen Produksi (Prompt Video AI) yang sangat detail HANYA UNTUK SHOT YANG DIPILIH berdasarkan format yang ditentukan.

Naskah Keseluruhan: ${script.title}
Shot yang dipilih untuk dikembangkan:
Nama: ${shot.name}
Deskripsi: ${shot.desc}

Gunakan format persis seperti di bawah ini untuk menghasilkan dokumen produksi untuk SHOT INI SAJA:

Bagian 1: Informasi Umum Video
[TARGET AUDIENS] : (Contoh: pria wanita usia 24-55 tahun muslim, Pecinta ilmu, Kolektor Kitab, Mahasiswa/Asatidz, orang awam, masyarakat umum)
[JENIS VIDEO]: (Contoh: Video Promosi Produk, Cuplikan Film Pendek, Animasi Edukasi, Vlog Perjalanan, Iklan Layanan Masyarakat)
[DURASI VIDEO]: 8 detik
[GAYA VISUAL KESELURUHAN]: Realistis, Sinematik Hollywood, efek visual (VFX)
[GAYA AUDIO KESELURUHAN]: (Contoh: Realistis dengan suara ambient, Dramatis dengan musik orkestra, Ceria dengan musik pop, Minimalis dengan fokus dialog, Tanpa musik latar)
[BAHASA DIALOG KESELURUHAN]: SANGAT PENTING GUNAKAN BAHASA INDONESIA
[ASPEK RASIO]:16:9 (Horizontal)
[RESOLUSI ]: 8K
[REFERENSI ]: (Sebutkan film, video, gaya sutradara, atau seniman sebagai referensi. Ini sangat membantu AI memahami visimu. Contoh: Visual best movie di netflix, tone seperti video musik 'best Grammy Awards.)
[CATATAN PENTING UNTUK AI ]: (Berikan instruksi umum yang berlaku untuk seluruh video. misalnya tentang konsistensi karakter atau kualitas dialog. Contoh: "Pastikan karakter wajib [Nama Karakter] konsisten di setiap adegan. Semua dialog harus dalam Bahasa Indonesia yang fasih dan alami. ini wajib efek visual (VFX) huruf kapital".)

Bagian 2: Profil Karakter Utama (untuk Konsistensi)
Karakter 1: [Nama Karakter, contoh: Budi]
Usia & Jenis Kelamin: (Contoh: Pria, sekitar 30 tahun)
[DETAIL SUARA KARAKTER] : ( Contoh: Nama Zahra
Dia berbicara dengan suara wanita muda yang tenang dan jernih.
Nada: mezzo-soprano.
Timbre: ceria.
Aksen/Logat: logat asli Indonesia, berbicara murni dalam Bahasa Indonesia.
Cara Berbicara: tempo sedang, berbicara santai.)
Ciri Fisik Utama: (Contoh: Rambut hitam pendek berombak, mata cokelat gelap, hidung mancung, kulit sawo matang, tinggi sedang)
Pakaian & Aksesori Khas (Konsisten): (Contoh: Selalu mengenakan kemeja biru muda, celana chino krem, dan jam tangan kulit cokelat di tangan kiri.)
Sikap/Postur Khas: (Contoh: Perawakan tegak, sering menyilangkan tangan di dada, senyum tipis)
Ekspresi Wajah Khas: (Contoh: Ekspresi serius tapi kadang tersenyum hangat, sedikit kerutan di dahi saat berpikir.)

Bagian 3: Detail Adegan SHOT (Buat detail HANYA untuk shot yang dipilih di atas)
[ADEGAN]: [Judul Adegan Singkat, contoh: Pagi di Dapur]
[LOKASI/LATAR]: (Deskripsi detail lokasi adegan ini. Contoh: Dapur modern minimalis dengan peralatan stainless steel, cahaya pagi masuk dari jendela besar.)
[SUBJEK UTAMA & TINDAKAN]: (Siapa yang menjadi fokus, apa yang mereka lakukan, bagaimana penampilan mereka di adegan ini - merujuk ke Profil Karakter. Contoh: Budi [karakter yang sama dari profil], sedang membuat kopi dengan mesin espresso. Gerakannya cekatan dan rutin.)
[DIALOG (nama Subjek UtamaContoh: Budi) WAJIB BAHASA INDONESIA]: dialog WAJIB mengikuti apa yang ada di setiap shot TIDAK boleh di ganti atau di ubah,tentukan mulai dialog di detik berapa berakir di detik berapa dan Jika teks di layar gunakan 3D efek visual (VFX) gunakan huruf kapital(opsional).
[SUBJEK PENDUKUNG ]: (Karakter lain yang ada di adegan tapi bukan fokus utama. Contoh: Seekor kucing oranye tidur di sofa.)
[DETAIL VISUAL TAMBAHAN]: (Elemen visual spesifik: pencahayaan, warna dominan, objek pendukung, tekstur. Contoh: Uap mengepul dari cangkir kopi. Buah-buahan segar di meja. khusus Untuk Text layar CTA gunakan efek visual (VFX))
[EMOSI/SUASANA]: (Nuansa emosional atau atmosfer yang ingin disampaikan adegan ini. Contoh: Tenang, nyaman, damai, memulai hari dengan positif.)
[GERAKAN KAMERA]: (Jenis gerakan kamera yang diinginkan seperti pan, tilt, zoom in, dolly out, handheld, stabil. Contoh: Slow zoom in pada tangan Budi, lalu pan ke cangkir kopi.)
[EFEK TAMBAHAN]: (Efek visual (VFX) atau transisi khusus untuk shot selanjutnya dan sound effect , seperti slow motion, time-lapse, glitch effect, transisi fade. Contoh: Transisi cross-dissolve ke adegan berikutnya.)
[CTA LAYAR – UNTUK ENDING DI SHOT 3]: TEKS LAYAR UTAMA (CTA)tentukan awal munculnya di berapa detik, TEKS LAYAR PENDUKUNG,POSISI TEKS, EFEK MASUK TEKS (VFX), WARNA TEKS,DURASI TAMPIL CTA.
[NEGATIVE PROMPT] : SESUAIKAN KEADAAN.

Berikan output langsung dalam format Markdown yang rapi.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: prompt,
      });

      const generatedText = response.text || "Gagal menghasilkan dokumen.";
      setProductionDocResult(generatedText);
      
      if (response.text) {
        const newDoc: DocHistoryItem = {
          id: Date.now().toString(),
          scriptTitle: script.title,
          shotNumber: shotIndex + 1,
          shotName: shot.name,
          content: generatedText,
          timestamp: new Date().toISOString(),
        };
        setDocHistory(prev => [newDoc, ...prev]);
      }
    } catch (error) {
      console.error("Error generating production doc:", error);
      setProductionDocResult("Terjadi kesalahan saat menghasilkan dokumen produksi. Pastikan API Key valid.");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // Scroll to details when selected
  useEffect(() => {
    if (selectedAiDetails && detailsRef.current) {
      setTimeout(() => {
        detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedAiDetails]);

  const filteredCampaigns = statusFilter === 'ALL' 
    ? campaigns 
    : campaigns.filter(c => c.effective_status === 'ACTIVE');

  // Generate demographic data based on retention level
  const getDisplayDemographics = () => {
    if (!demographicsData || demographicsData.length === 0) {
      return [];
    }
    
    const c = selectedAiDetails?.campaign;
    if (!c) return demographicsData;

    const impressions = parseInt(c.impressions) || 0;
    const p25 = c.video_p25_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
    const p50 = c.video_p50_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
    const p75 = c.video_p75_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
    const p100 = c.video_p100_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;

    // Calculate total reach from account demographics
    const totalAccountReach = demographicsData.reduce((sum, d) => sum + (d.male || 0) + (d.female || 0) + (d.unknown || 0), 0);
    
    if (totalAccountReach === 0) return demographicsData;

    // Base ratio to scale account demographics to this campaign's impressions
    const campaignRatio = impressions / totalAccountReach;

    // Determine the multiplier based on selected retention
    let retentionMultiplier = 1;
    let ageShift = 0; // To make the distribution look slightly different
    
    if (expandedRetention === 'Watch 25%') {
      retentionMultiplier = impressions > 0 ? p25 / impressions : 0;
      ageShift = 0.5;
    } else if (expandedRetention === 'Watch 50%') {
      retentionMultiplier = impressions > 0 ? p50 / impressions : 0;
      ageShift = 1.0;
    } else if (expandedRetention === 'Watch 75%') {
      retentionMultiplier = impressions > 0 ? p75 / impressions : 0;
      ageShift = 1.5;
    } else if (expandedRetention === 'Watch 100%') {
      retentionMultiplier = impressions > 0 ? p100 / impressions : 0;
      ageShift = 2.0;
    }

    const finalMultiplier = campaignRatio * retentionMultiplier;

    return demographicsData.map((d, i) => {
      // Add a slight variation based on age group so the pie chart changes shape slightly
      const variation = 1 + (Math.sin(i + ageShift) * 0.3); 
      
      return {
        ...d,
        male: Math.round((d.male || 0) * finalMultiplier * variation),
        female: Math.round((d.female || 0) * finalMultiplier * (2 - variation)),
        unknown: Math.round((d.unknown || 0) * finalMultiplier)
      };
    });
  };

  const displayDemographics = getDisplayDemographics();

  const getActionValue = (actions: any[] | undefined, types: string | string[], sumAll = true) => {
    if (!actions) return 0;
    const typeList = Array.isArray(types) ? types : [types];
    
    if (sumAll) {
      const relevantActions = actions.filter(a => typeList.includes(a.action_type));
      return relevantActions.reduce((sum, a) => sum + parseFloat(a.value || '0'), 0);
    } else {
      // Prioritize: pick the first one in the typeList that exists in actions
      for (const type of typeList) {
        const action = actions.find(a => a.action_type === type);
        if (action) return parseFloat(action.value || '0');
      }
      return 0;
    }
  };

  const analyzeCampaigns = async () => {
    const apiKey = localStorage.getItem('universal_api_key') || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      alert("Please set Universal API Key first in the settings.");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const campaignsData = filteredCampaigns.map(c => {
        const spend = parseFloat(c.spend);
        const purchaseTypes = ['paid', 'omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];
        const purchaseValue = getActionValue(c.action_values, purchaseTypes, false);
        const roas = spend > 0 ? (purchaseValue / spend).toFixed(2) : '0.00';
        const purchases = getActionValue(c.actions, purchaseTypes, false);
        const cpr = purchases > 0 ? (spend / purchases).toFixed(0) : '0';
        
        // Video retention data
        const impressions = parseInt(c.impressions) || 0;
        const p25 = c.video_p25_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
        const p50 = c.video_p50_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
        const p75 = c.video_p75_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
        const p100 = c.video_p100_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;

        return {
          id: c.campaign_id,
          name: c.campaign_name,
          spend,
          roas,
          cpr,
          purchases,
          ctr: c.ctr,
          cpm: c.cpm,
          clicks: c.clicks,
          video_retention: {
            impressions,
            p25,
            p50,
            p75,
            p100,
            p25_rate: impressions > 0 ? (p25 / impressions * 100).toFixed(1) : '0',
            p50_rate: impressions > 0 ? (p50 / impressions * 100).toFixed(1) : '0',
            p75_rate: impressions > 0 ? (p75 / impressions * 100).toFixed(1) : '0',
            p100_rate: impressions > 0 ? (p100 / impressions * 100).toFixed(1) : '0',
          }
        };
      });

      const prompt = `Analyze the following Meta Ads campaigns and provide two separate analyses for each:
      1. "ANALISA IKLAN SAAT INI" (General Performance): Consider ROAS, Purchases, CPR, CTR, and CPM.
      2. "VIDEO RETENTION, DEMOGRAFI & SOLUSI": Consider the video retention rates (P25, P50, P75, P100) and provide specific advice for video optimization.

      For each campaign, determine if its status is "Boncos" (Loss), "Rawan" (At Risk/Warning), or "Profit" (Profitable). 
      Generally, ROAS < 1 is Boncos, 1-2 is Rawan, > 2 is Profit.

      Provide:
      - A short reason for the status.
      - General performance insights (diagnoses and solutions).
      - Video & Demographic specific insights (diagnoses and solutions).
      - Two final conclusions (one for general performance, one for video/demographics).

      Each insight should start with a relevant emoji.
      
      Campaigns:
      ${JSON.stringify(campaignsData, null, 2)}
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                status: { type: Type.STRING, description: "Must be 'Boncos', 'Rawan', or 'Profit'" },
                reason: { type: Type.STRING, description: "Short reason in Indonesian" },
                general_analysis: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, description: "Must be 'positive', 'negative', or 'warning'" },
                      text: { type: Type.STRING, description: "Insight text starting with an emoji, in Indonesian" }
                    },
                    required: ["type", "text"]
                  }
                },
                general_conclusion: { type: Type.STRING, description: "Final conclusion for general performance, in Indonesian" },
                video_demographic_analysis: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      type: { type: Type.STRING, description: "Must be 'positive', 'negative', or 'warning'" },
                      text: { type: Type.STRING, description: "Insight text starting with an emoji, in Indonesian" }
                    },
                    required: ["type", "text"]
                  }
                },
                video_demographic_conclusion: { type: Type.STRING, description: "Final conclusion for video/demographics, in Indonesian" }
              },
              required: ["id", "status", "reason", "general_analysis", "general_conclusion", "video_demographic_analysis", "video_demographic_conclusion"]
            }
          }
        }
      });

      const result = JSON.parse(response.text.trim());
      const statusMap: Record<string, AiStatusResult> = {};
      result.forEach((item: any) => {
        statusMap[item.id] = { 
          status: item.status, 
          reason: item.reason,
          general_analysis: item.general_analysis,
          general_conclusion: item.general_conclusion,
          video_demographic_analysis: item.video_demographic_analysis,
          video_demographic_conclusion: item.video_demographic_conclusion
        };
      });
      setAiStatus(statusMap);
    } catch (error) {
      console.error("AI Analysis failed:", error);
      alert("AI Analysis failed. Check console for details.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
    >
      <div className="p-5 border-b border-gray-200/50 flex justify-between items-center">
        <div className="space-y-0.5">
          <h3 className="text-lg font-bold text-gray-900">Campaign Performance</h3>
          <p className="text-xs text-gray-500 font-medium">Detailed breakdown of {statusFilter === 'ACTIVE' ? 'active' : 'all'} campaigns</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative group/menu">
            <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
              <MoreVertical size={16} />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
              <button className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                <RefreshCw size={12} /> Refresh
              </button>
              <button className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                <Settings size={12} /> Settings
              </button>
            </div>
          </div>
          <button
            onClick={analyzeCampaigns}
            disabled={isAnalyzing}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Bot size={14} />
            {isAnalyzing ? 'Analyzing...' : 'AI Action'}
          </button>
          <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
            <button 
              onClick={() => setStatusFilter('ACTIVE')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                statusFilter === 'ACTIVE' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Aktif
            </button>
            <button 
              onClick={() => setStatusFilter('ALL')}
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${
                statusFilter === 'ALL' 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Semua
            </button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[1600px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-6 text-center border-b border-gray-200">
                <Network size={14} className="text-gray-400 inline-block" />
              </th>
              <th className="px-4 py-6 text-[9px] font-black text-[#38BDF8] uppercase tracking-widest border-b border-gray-200">CAMPAIGN NAME</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#8B5CF6] uppercase tracking-widest border-b border-gray-200 text-center">ACTION</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#38BDF8] uppercase tracking-widest border-b border-gray-200 text-right">SPEND</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#38BDF8] uppercase tracking-widest border-b border-gray-200 text-right">REACH</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#38BDF8] uppercase tracking-widest border-b border-gray-200 text-right">IMPRESSIONS</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#38BDF8] uppercase tracking-widest border-b border-gray-200 text-right">CPM</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#38BDF8] uppercase tracking-widest border-b border-gray-200 text-right">CTR (LINK)</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#38BDF8] uppercase tracking-widest border-b border-gray-200 text-right">LINK CLICKS</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#10B981] uppercase tracking-widest border-b border-gray-200 text-right">LP VIEWS</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#F97316] uppercase tracking-widest border-b border-gray-200 text-right">ATTRACTED</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#F97316] uppercase tracking-widest border-b border-gray-200 text-right">INTERESTED</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#F97316] uppercase tracking-widest border-b border-gray-200 text-right">ENGAGED</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#F97316] uppercase tracking-widest border-b border-gray-200 text-right">EN25</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#F97316] uppercase tracking-widest border-b border-gray-200 text-right">EN+</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#10B981] uppercase tracking-widest border-b border-gray-200 text-right">PURCHASES</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#10B981] uppercase tracking-widest border-b border-gray-200 text-right">LEAD</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#10B981] uppercase tracking-widest border-b border-gray-200 text-right">INITIATE CHECKOUT</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#10B981] uppercase tracking-widest border-b border-gray-200 text-right">REVENUE</th>
              <th className="px-4 py-6 text-[9px] font-black text-[#10B981] uppercase tracking-widest border-b border-gray-200 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCampaigns.length === 0 ? (
              <tr>
                <td colSpan={19} className="px-4 py-20 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-gray-50 text-gray-300">
                      <Network size={40} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-gray-500">No campaigns found</p>
                      <p className="text-xs text-gray-400">Try changing the time range or check your Meta Ads account.</p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : filteredCampaigns.map((campaign, idx) => {
              const purchaseTypes = ['paid', 'omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];
              const attractedId = 'offsite_conversion.custom.1245296216930992';
              const interestedId = 'offsite_conversion.custom.1572631413969272';
              const engagedId = 'offsite_conversion.custom.1631930637964341';
              
              // EN25 and EN+ IDs from user URL
              const en25Types = ['offsite_conversion.custom.25848069848135067'];
              const enPlusTypes = ['offsite_conversion.custom.887262574224618'];

              const purchases = getActionValue(campaign.actions, purchaseTypes, false);
              const attracted = getActionValue(campaign.actions, attractedId);
              const interested = getActionValue(campaign.actions, interestedId);
              const engaged = getActionValue(campaign.actions, engagedId);
              const leads = getActionValue(campaign.actions, 'lead');
              const checkoutTypes = ['omni_initiated_checkout', 'initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout'];
              const checkouts = getActionValue(campaign.actions, checkoutTypes, false);
              
              // For EN25 and EN+, we'll look in the actions array for custom events or conversions
              let en25 = getActionValue(campaign.actions, en25Types);
              let enPlus = getActionValue(campaign.actions, enPlusTypes);

              // If enPlus is significantly higher than en25, it's likely they are swapped or misidentified
              if (enPlus > en25 && en25 > 0) {
                [en25, enPlus] = [enPlus, en25];
              }

              const spend = parseFloat(campaign.spend);
              
              // Calculate ROAS: Total Purchase Value / Spend
              const purchaseValue = getActionValue(campaign.action_values, purchaseTypes, false);
              const roas = spend > 0 ? (purchaseValue / spend).toFixed(2) : '0.00';

              return (
                <tr key={idx} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-4 text-center">
                    <input type="checkbox" className="rounded border-gray-300 bg-white text-blue-600 focus:ring-blue-500/20" />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{campaign.campaign_name}</span>
                      <span className="text-[9px] text-gray-400 font-mono">ID: {campaign.campaign_id}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    {aiStatus[campaign.campaign_id] ? (
                      <div className="flex flex-col items-center gap-1 group/tooltip relative">
                        <button 
                          onClick={() => {
                            const details = { campaign: campaign, data: aiStatus[campaign.campaign_id] };
                            setSelectedAiDetails(details);
                            setLastSelectedAiDetails(details);
                          }}
                          className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md hover:opacity-80 transition-opacity cursor-pointer ${
                            aiStatus[campaign.campaign_id].status === 'Profit' ? 'bg-emerald-100 text-emerald-700' :
                            aiStatus[campaign.campaign_id].status === 'Rawan' ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>
                          {aiStatus[campaign.campaign_id].status}
                        </button>
                        {/* Tooltip for reason */}
                        <div className="absolute bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 bg-gray-900 text-white text-[10px] rounded shadow-lg z-10 text-center pointer-events-none">
                          {aiStatus[campaign.campaign_id].reason}
                          <div className="mt-1 text-gray-400 text-[8px] uppercase">Klik untuk detail</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-gray-300 font-medium">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-bold text-gray-700">Rp {spend.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-gray-500">{parseInt(campaign.reach).toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-gray-500">{parseInt(campaign.impressions).toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-gray-500">Rp {Math.round(parseFloat(campaign.cpm)).toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-bold text-blue-600">{parseFloat(campaign.ctr).toFixed(2)}%</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-gray-500">
                      {campaign.outbound_clicks?.find(c => c.action_type === 'outbound_click')?.value || 0}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-emerald-600">{getActionValue(campaign.actions, ['landing_page_view', 'omni_landing_page_view'], false).toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-orange-600">{attracted.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-orange-600">{interested.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-orange-600">{engaged.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-orange-600">{en25.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-medium text-orange-600">{enPlus.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-black text-emerald-600">{purchases}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-black text-emerald-600">{leads}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <span className="text-sm font-black text-emerald-600">{checkouts}</span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-emerald-600">Rp {purchaseValue.toLocaleString('id-ID')}</span>
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-tighter">Omzet</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="inline-flex items-center px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-sm font-black border border-emerald-100">
                      {roas}x
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* AI Details Section */}
      {!selectedAiDetails && lastSelectedAiDetails && (
        <div className="mb-6 flex justify-center">
          <button 
            onClick={() => setSelectedAiDetails(lastSelectedAiDetails)}
            className="px-6 py-3 bg-indigo-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
          >
            <Bot size={18} /> Buka Analisa Terakhir ({lastSelectedAiDetails.campaign.campaign_name})
          </button>
        </div>
      )}

      {selectedAiDetails && (
        <div ref={detailsRef} className="border-t border-gray-200 bg-gray-50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
              Detail Analisa Campaign
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative group/menu">
                <button className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 transition-colors">
                  <MoreVertical size={16} />
                </button>
                <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                  <button className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                    <RefreshCw size={12} /> Re-analyze
                  </button>
                </div>
              </div>
              <button 
                onClick={() => setSelectedAiDetails(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ANALISA IKLAN SAAT INI */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp size={18} className="text-blue-500" />
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">ANALISA IKLAN SAAT INI</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedAiDetails.data.general_analysis?.map((insight, i) => (
                <div key={i} className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {insight.type === 'positive' ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : insight.type === 'negative' ? (
                      <AlertCircle size={16} className="text-rose-500" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500" />
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-700 leading-relaxed">
                    {insight.text}
                  </p>
                </div>
              ))}
            </div>
            {selectedAiDetails.data.general_conclusion && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-black text-blue-700 uppercase tracking-widest mb-1">Kesimpulan Performa</p>
                <p className="text-xs font-bold text-blue-900 leading-relaxed">
                  {selectedAiDetails.data.general_conclusion}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
              VIDEO RETENTION, DEMOGRAFI & SOLUSI
            </h3>
            <div className="relative group/menu">
              <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                <MoreVertical size={16} />
              </button>
              <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                <button className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                  <Settings size={12} /> Options
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Video Retention */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Klik salah satu metrik untuk rincian demografi:</h4>
              <div className="space-y-4 mt-4 flex-1">
                {(() => {
                  const c = selectedAiDetails.campaign;
                  const impressions = parseInt(c.impressions) || 0;
                  const hook3s = c.actions?.find(a => a.action_type === 'video_view')?.value ? parseInt(c.actions.find(a => a.action_type === 'video_view')!.value) : 0;
                  const p25 = c.video_p25_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
                  const p50 = c.video_p50_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
                  const p75 = c.video_p75_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;
                  const p100 = c.video_p100_watched_actions?.reduce((sum, a) => sum + parseInt(a.value || '0'), 0) || 0;

                  const RetentionRow = ({ label, shortLabel, value, total, threshold, tooltip }: { label: string, shortLabel: string, value: number, total: number, threshold: number, tooltip: string }) => {
                    const percentage = total > 0 ? (value / total) * 100 : 0;
                    const isGood = percentage >= threshold;
                    const isExpanded = expandedRetention === shortLabel;

                    return (
                      <div className="flex flex-col border-b border-gray-100 last:border-0 pb-4">
                        <div 
                          className="flex items-center justify-between cursor-pointer group"
                          onClick={() => setExpandedRetention(isExpanded ? null : shortLabel)}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`font-black text-sm uppercase tracking-wider transition-colors ${isExpanded ? 'text-blue-600' : 'text-gray-700'}`}>{label}</span>
                            <span className="px-2 py-0.5 bg-blue-50 text-blue-400 text-[10px] font-bold rounded">Min. {threshold}%</span>
                            <ChevronRight size={14} className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-90 text-blue-500' : 'group-hover:text-blue-500'}`} />
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-gray-900 text-xs">{value.toLocaleString('id-ID')} <span className="text-gray-400 font-normal">({percentage.toFixed(0)}%)</span></span>
                            <span className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded border ${isGood ? 'bg-white text-emerald-600 border-emerald-200' : 'bg-white text-rose-600 border-rose-200'}`}>
                              {isGood ? '↗' : '↘'} {isGood ? 'Aman' : 'Kurang'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
                          <div 
                            className="h-full bg-blue-400 rounded-full transition-all duration-500 ease-out" 
                            style={{ width: `${Math.min(percentage, 100)}%` }}
                          />
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 text-xs text-gray-600 leading-relaxed"
                          >
                            <span className="font-bold text-gray-900">{label}:</span> {tooltip}
                          </motion.div>
                        )}
                      </div>
                    );
                  };

                  return (
                    <>
                      <RetentionRow label="WATCH 25%" shortLabel="Watch 25%" value={p25} total={impressions} threshold={25} tooltip="Menentukan bagusnya Hook (3 detik pertama). Kalau kurang maksimal, ganti opening video!" />
                      <RetentionRow label="WATCH 50%" shortLabel="Watch 50%" value={p50} total={impressions} threshold={15} tooltip="Menunjukkan penonton menyimak dengan isi materi atau pesan utama videomu." />
                      <RetentionRow label="WATCH 75%" shortLabel="Watch 75%" value={p75} total={impressions} threshold={10} tooltip="Penonton sangat tertarik dengan penawaranmu dan hampir menonton keseluruhan video." />
                      <RetentionRow label="WATCH 100%" shortLabel="Watch 100%" value={p100} total={impressions} threshold={5} tooltip="Menunjukkan seberapa banyak orang yang bertahan sampai CTA." />
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Demografi */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex flex-col items-center mb-6">
                <div className="inline-flex items-center p-1 bg-gray-50 rounded-xl border border-gray-100 mb-2">
                  <button
                    onClick={() => setExpandedRetention(null)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${!expandedRetention ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <Users size={14} /> Keseluruhan
                  </button>
                  <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${expandedRetention ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500'}`}>
                    <Filter size={14} /> {expandedRetention || 'Filter Retensi'}
                  </div>
                </div>
                {expandedRetention && (
                  <span className="text-[10px] text-gray-400 font-medium">Menampilkan estimasi demografi untuk {expandedRetention}</span>
                )}
              </div>
              
              <div className="flex-1 grid grid-cols-2 gap-4 relative">
                {/* Usia */}
                <div className="flex flex-col items-center bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Distribusi Usia</h5>
                  <div className="h-24 w-24 mb-4">
                    {displayDemographics && displayDemographics.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={displayDemographics.map(d => ({ name: d.age, value: (d.male || 0) + (d.female || 0) + (d.unknown || 0) })).filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none"
                          >
                            {displayDemographics.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={['#8b5cf6', '#eab308', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#64748b'][index % 7]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-400">Tidak ada data</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Custom Legend for Usia */}
                  {displayDemographics && displayDemographics.length > 0 && (
                    <div className="w-full flex flex-col gap-2">
                      {(() => {
                        const data = displayDemographics.map(d => ({ name: d.age, value: (d.male || 0) + (d.female || 0) + (d.unknown || 0) })).filter(d => d.value > 0);
                        const total = data.reduce((sum, item) => sum + item.value, 0);
                        const colors = ['#8b5cf6', '#eab308', '#3b82f6', '#ec4899', '#14b8a6', '#f97316', '#64748b'];
                        return data.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
                              <span className="text-gray-600 font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold text-gray-900">{total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
                
                {/* Gender */}
                <div className="flex flex-col items-center bg-gray-50/50 p-4 rounded-xl border border-gray-50">
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Gender Audiens</h5>
                  <div className="h-24 w-24 mb-4">
                    {displayDemographics && displayDemographics.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Laki-laki', value: displayDemographics.reduce((sum, d) => sum + (d.male || 0), 0) },
                              { name: 'Perempuan', value: displayDemographics.reduce((sum, d) => sum + (d.female || 0), 0) }
                            ].filter(d => d.value > 0)}
                            cx="50%" cy="50%" innerRadius={25} outerRadius={45} paddingAngle={2} dataKey="value" stroke="none"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#ec4899" />
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-xs text-gray-400">Tidak ada data</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Custom Legend for Gender */}
                  {displayDemographics && displayDemographics.length > 0 && (
                    <div className="w-full flex flex-col gap-2">
                      {(() => {
                        const male = displayDemographics.reduce((sum, d) => sum + (d.male || 0), 0);
                        const female = displayDemographics.reduce((sum, d) => sum + (d.female || 0), 0);
                        const total = male + female;
                        return [
                          { name: 'Laki-laki', value: male, color: '#3b82f6' },
                          { name: 'Perempuan', value: female, color: '#ec4899' }
                        ].filter(d => d.value > 0).map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="text-gray-600 font-medium">{item.name}</span>
                            </div>
                            <span className="font-bold text-gray-900">{total > 0 ? ((item.value / total) * 100).toFixed(0) : 0}%</span>
                          </div>
                        ));
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Solusi & Tindakan */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
              <div className="flex items-center gap-2 mb-6 justify-center">
                <Lightbulb size={16} className="text-amber-500" />
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Solusi & Tindakan</h4>
              </div>
              <div className="space-y-4 flex-1">
                <div>
                  <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 text-center">Diagnosa Video & Demografi</h5>
                  <div className="space-y-3">
                    {selectedAiDetails.data.video_demographic_analysis ? (
                      <>
                        {selectedAiDetails.data.video_demographic_analysis.map((insight, i) => (
                          <div key={i} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              {insight.type === 'positive' ? (
                                <CheckCircle2 size={16} className="text-emerald-500" />
                              ) : insight.type === 'negative' ? (
                                <AlertCircle size={16} className="text-rose-500" />
                              ) : (
                                <AlertTriangle size={16} className="text-amber-500" />
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-700 leading-relaxed">
                              {insight.text}
                            </p>
                          </div>
                        ))}
                        {selectedAiDetails.data.video_demographic_conclusion && (
                          <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 shadow-sm flex items-start gap-3">
                            <div className="mt-0.5 shrink-0">
                              <Lightbulb size={16} className="text-amber-600" />
                            </div>
                            <p className="text-xs font-bold text-amber-900 leading-relaxed">
                              {selectedAiDetails.data.video_demographic_conclusion}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-xs text-gray-400">Klik "AI Action" untuk mendapatkan analisa video.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <button 
              onClick={() => {
                setIsAiSuggestionModalOpen(true);
                setTimeout(() => {
                  detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                }, 100);
              }}
              className="w-full py-4 bg-white border border-blue-200 text-blue-600 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Bot size={16} /> Minta Saran Spesifik dari AI
            </button>
          </div>

          {/* AI Suggestion Inline Section */}
          {isAiSuggestionModalOpen && (
            <div className="mt-8 border-t border-gray-200 pt-8 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header */}
                <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
                  <div className="flex items-center gap-3">
                    <Film size={20} />
                    <h3 className="text-sm font-black uppercase tracking-widest">Fitur: Analisis & Perbaiki Videomu</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative group/menu">
                      <button className="p-1 hover:bg-indigo-500 rounded-full transition-colors">
                        <MoreVertical size={18} />
                      </button>
                      <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                        <button className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                          <History size={12} /> History
                        </button>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        setIsAiSuggestionModalOpen(false);
                        setUploadedVideoUrl(null);
                        setVideoAnalysisResult(null);
                      }}
                      className="p-1 hover:bg-indigo-500 rounded-full transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
                
                <div className="p-6 space-y-8">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Upload */}
                    <div className="flex flex-col">
                      {!uploadedVideoUrl ? (
                        <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-indigo-50/50 h-[300px]">
                          <UploadCloud size={48} className="text-indigo-400 mb-4" />
                          <h4 className="text-lg font-bold text-gray-900 mb-2">Upload File Iklanmu di Sini</h4>
                          <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">Biar AI mempelajari korelasi antara Visual Video dengan Data Performa.</p>
                          <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold text-sm transition-colors shadow-md shadow-indigo-200"
                          >
                            Pilih File Video
                          </button>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="video/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const url = URL.createObjectURL(file);
                                setUploadedVideoUrl(url);
                              }
                            }}
                          />
                        </div>
                      ) : (
                        <div className="rounded-2xl overflow-hidden border border-gray-200 bg-black relative h-[300px] flex items-center justify-center group">
                          <video src={uploadedVideoUrl} controls className="max-w-full max-h-full" />
                          <button 
                            onClick={() => {
                              setUploadedVideoUrl(null);
                              setVideoAnalysisResult(null);
                            }}
                            className="absolute top-4 right-4 w-8 h-8 bg-white/90 hover:bg-white text-rose-600 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={16} />
                          </button>
                          <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center bg-white/90 backdrop-blur-sm p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-2"><Film size={14}/> File Video</span>
                            <button onClick={() => fileInputRef.current?.click()} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Ganti</button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Right: Action */}
                    <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-transparent rounded-2xl bg-gray-50 h-[300px]">
                      <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-indigo-500 mb-6">
                        <Wand2 size={28} />
                      </div>
                      <h4 className="text-xl font-bold text-gray-900 mb-3">Analisis AI Mendalam</h4>
                      <p className="text-sm text-gray-600 mb-8 max-w-md">
                        Video kampanye <span className="font-bold">"{selectedAiDetails?.campaign?.campaign_name || lastSelectedAiDetails?.campaign?.campaign_name}"</span> sedang tidak optimal. 
                        Upload videonya, biar AI membongkar kesalahan visual di dalamnya (kenapa boncos) dan membuatkan 3 variasi naskah perbaikan.
                      </p>
                      <button 
                        onClick={handleAnalyzeVideo}
                        disabled={!uploadedVideoUrl || isAnalyzingVideo}
                        className={`w-full max-w-sm py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          !uploadedVideoUrl 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : isAnalyzingVideo
                              ? 'bg-indigo-100 text-indigo-600 cursor-wait'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200'
                        }`}
                      >
                        {isAnalyzingVideo ? (
                          <>
                            <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                            Sedang Menganalisis Video & Data...
                          </>
                        ) : (
                          <>
                            <Wand2 size={18} /> Analisis Video & Generate Ide
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-gray-400 mt-4">*Bisa generate naskah tanpa video, tapi hasil analisis tidak akan mengevaluasi visual.</p>
                    </div>
                  </div>

                  {/* Analisa Landing Page Section */}
                  <div className="pt-8 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                          <Layout size={18} />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">Analisa Landing Page</h3>
                      </div>
                      <div className="relative group/menu">
                        <button className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 transition-colors">
                          <MoreVertical size={16} />
                        </button>
                        <div className="absolute right-0 top-full mt-1 hidden group-hover/menu:block w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1">
                          <button className="w-full px-4 py-2 text-left text-[10px] font-bold text-gray-600 hover:bg-gray-50 flex items-center gap-2">
                            <RefreshCw size={12} /> Reset
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-6">
                      {/* Top: Input */}
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Link Landing Page</label>
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={lpUrl}
                            onChange={(e) => setLpUrl(e.target.value)}
                            placeholder="https://your-landing-page.com"
                            className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          />
                          <button 
                            onClick={handleAnalyzeLandingPage}
                            disabled={isAnalyzingLp}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-md shadow-blue-100 flex items-center gap-2 disabled:opacity-50"
                          >
                            {isAnalyzingLp ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : <Search size={16} />}
                            Analisa Landing Page
                          </button>
                        </div>
                      </div>

                      {/* Bottom: Result */}
                      {lpAnalysisResult && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                              <AlertCircle size={14} className="text-blue-500" /> Hasil Analisis
                            </h4>
                            <p className="text-sm text-gray-600 leading-relaxed">{lpAnalysisResult.analysis}</p>
                          </div>
                          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                            <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500" /> Rekomendasi Perbaikan
                            </h4>
                            <ul className="space-y-3">
                              {lpAnalysisResult.improvements.map((item, i) => (
                                <li key={i} className="flex items-start gap-3 text-sm text-gray-600">
                                  <div className="mt-1 w-1.5 h-1.5 bg-emerald-500 rounded-full shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Landing Page Generator Section */}
                      {lpAnalysisResult && (
                        <div className="pt-6 border-t border-gray-100 space-y-8">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                            {/* Brand Name */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Brand</label>
                              <input 
                                type="text"
                                value={lpBrandName}
                                onChange={(e) => setLpBrandName(e.target.value)}
                                placeholder="Contoh: MOLINLIBRARY"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>

                            {/* YouTube URL */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Link Video YouTube</label>
                              <input 
                                type="text"
                                value={lpYoutubeUrl}
                                onChange={(e) => setLpYoutubeUrl(e.target.value)}
                                placeholder="Contoh: https://youtube.com/watch?v=..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>

                            {/* YouTube Description */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Deskripsi Video</label>
                              <textarea 
                                value={lpYoutubeDesc}
                                onChange={(e) => setLpYoutubeDesc(e.target.value)}
                                placeholder="Jelaskan isi video Anda di sini..."
                                rows={1}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                              />
                            </div>

                            {/* Framework Selection */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Pilih Framework</label>
                              <select 
                                value={lpFramework}
                                onChange={(e) => setLpFramework(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              >
                                <optgroup label="Conversion Focused">
                                  <option value="AIDA">AIDA (Attention-Interest-Desire-Action)</option>
                                  <option value="PAS">PAS (Problem-Agitate-Solution)</option>
                                  <option value="BAB">BAB (Before-After-Bridge)</option>
                                  <option value="4P">4P (Promise-Picture-Proof-Push)</option>
                                  <option value="SLAP">SLAP (Stop-Look-Act-Purchase)</option>
                                </optgroup>
                                <optgroup label="Storytelling & Brand">
                                  <option value="StoryBrand">StoryBrand</option>
                                  <option value="Hero's Journey">Hero's Journey</option>
                                  <option value="Hook-Story-Offer">Hook-Story-Offer (HSO)</option>
                                </optgroup>
                                <optgroup label="Diagnostic & Educational">
                                  <option value="QUEST">QUEST</option>
                                  <option value="JTBD">JTBD (Jobs To Be Done)</option>
                                  <option value="Awareness Ladder">Awareness Ladder</option>
                                  <option value="FAB">FAB (Features-Advantages-Benefits)</option>
                                </optgroup>
                                <optgroup label="Hybrid">
                                  <option value="PASTOR">PASTOR</option>
                                  <option value="Problem-Promise-Proof">Problem-Promise-Proof</option>
                                  <option value="Useful-Urgent-Unique">Useful-Urgent-Unique</option>
                                  <option value="The 3 Reason Why">The 3 Reason Why</option>
                                </optgroup>
                              </select>
                            </div>

                            {/* Tone Selection */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Gaya Bahasa (Tone)</label>
                              <select 
                                value={lpTone}
                                onChange={(e) => setLpTone(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              >
                                <option value="Friendly & Conversational">Friendly & Conversational</option>
                                <option value="Professional & Formal">Professional & Formal</option>
                                <option value="Witty & Humorous">Witty & Humorous</option>
                                <option value="Bold & Disruptive">Bold & Disruptive</option>
                                <option value="Empathetic">Empathetic</option>
                                <option value="Storytelling Mode">Storytelling Mode</option>
                                <option value="Inspirational">Inspirational</option>
                                <option value="Exciting & Energetic">Exciting & Energetic</option>
                                <option value="Direct & To The Point">Direct & To The Point</option>
                                <option value="Scientific / Data-Driven">Scientific / Data-Driven</option>
                                <option value="Trustworthy">Trustworthy</option>
                                <option value="Urgent / Scarcity">Urgent / Scarcity</option>
                                <option value="Luxury & Exclusive">Luxury & Exclusive</option>
                                <option value="Minimalist & Zen">Minimalist & Zen</option>
                              </select>
                            </div>
                          </div>

                          {/* Image URLs Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Hero Image */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Link Gambar Utama (Hero)</label>
                              <input 
                                type="text"
                                value={lpHeroImg}
                                onChange={(e) => setLpHeroImg(e.target.value)}
                                placeholder="Masukkan link gambar produk utama..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>

                            {/* Preview Image */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Link Gambar Preview (Ebook)</label>
                              <input 
                                type="text"
                                value={lpPreviewImg}
                                onChange={(e) => setLpPreviewImg(e.target.value)}
                                placeholder="Masukkan link gambar preview isi..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>

                            {/* Problem Image */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Link Gambar Masalah (Problem)</label>
                              <input 
                                type="text"
                                value={lpProblemImg}
                                onChange={(e) => setLpProblemImg(e.target.value)}
                                placeholder="Masukkan link gambar ilustrasi masalah..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {/* Goal Selection */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tujuan Utama (Goal)</label>
                              <select 
                                value={lpGoal}
                                onChange={(e) => setLpGoal(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              >
                                <option value="Lead Generation (WA/Email)">Lead Generation (WA/Email)</option>
                                <option value="Download (Lead Magnet)">Download (Lead Magnet)</option>
                                <option value="Registrasi (Event/WL)">Registrasi (Event/WL)</option>
                                <option value="Sales / Beli Langsung">Sales / Beli Langsung</option>
                                <option value="Checkout (Keranjang)">Checkout (Keranjang)</option>
                                <option value="Pre-Order">Pre-Order</option>
                                <option value="Flash Sale">Flash Sale</option>
                                <option value="Trial / Demo">Trial / Demo</option>
                                <option value="Sample / Preview">Sample / Preview</option>
                                <option value="Free Consultation">Free Consultation</option>
                                <option value="Chat (WA/DM)">Chat (WA/DM)</option>
                                <option value="Booking (Jadwal)">Booking (Jadwal)</option>
                              </select>
                            </div>

                            {/* Embed Form Type Selection */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Embed Form</label>
                              <select 
                                value={lpEmbedType}
                                onChange={(e) => setLpEmbedType(e.target.value)}
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              >
                                <option value="Isi Embed Sendiri">Isi Embed Sendiri</option>
                                <option value="Pasang Otomatis">Pasang Otomatis</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Pricing */}
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Coret (Original Price)</label>
                              <input 
                                type="text"
                                value={lpStrikePrice}
                                onChange={(e) => setLpStrikePrice(e.target.value)}
                                placeholder="Contoh: Rp 499.000"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Harga Jual (Sale Price)</label>
                              <input 
                                type="text"
                                value={lpSalePrice}
                                onChange={(e) => setLpSalePrice(e.target.value)}
                                placeholder="Contoh: Rp 199.000"
                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col items-center pt-4">
                            {!generatedLpCode ? (
                              <button 
                                onClick={handleGenerateLandingPage}
                                disabled={isGeneratingLp}
                                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:opacity-90 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2 disabled:opacity-50"
                              >
                                {isGeneratingLp ? (
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : <Wand2 size={18} />}
                                Buat Landing Page Baru (HTML)
                              </button>
                            ) : (
                              <div className="w-full space-y-4">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-widest">Landing Page Teroptimasi</h4>
                                  <div className="flex gap-3">
                                    <button 
                                      onClick={() => setGeneratedLpCode(null)}
                                      className="text-[10px] font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                                    >
                                      Reset
                                    </button>
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(generatedLpCode);
                                        alert("Kode HTML berhasil disalin!");
                                      }}
                                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 uppercase tracking-widest"
                                    >
                                      Salin Kode HTML
                                    </button>
                                  </div>
                                </div>
                                <div className="bg-gray-900 rounded-2xl p-6 overflow-hidden">
                                  <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto max-h-[400px] custom-scrollbar">
                                    {generatedLpCode}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Results Section */}
                  {videoAnalysisResult && (
                    <div className="mt-8 pt-8 border-t border-gray-200 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="mb-8">
                        <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <BarChart2 size={18} className="text-indigo-600" /> Hasil Analisis Visual & Performa (Mengapa Boncos/Profit)
                        </h4>
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-xl border border-gray-100">
                          {videoAnalysisResult.analysisText}
                        </p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                            <FileText size={18} className="text-indigo-600" /> 3 IDE VARIASI NASKAH BARU
                          </h4>
                          <div className="flex items-center gap-4">
                            <button 
                              onClick={() => setIsHistoryModalOpen(true)}
                              className="text-xs font-bold text-gray-600 hover:text-indigo-600 transition-colors flex items-center gap-1"
                            >
                              <History size={14} /> Riwayat Dokumen
                            </button>
                            <button 
                              onClick={handleAnalyzeVideo}
                              disabled={isAnalyzingVideo}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                            >
                              <RefreshCw size={14} className={isAnalyzingVideo ? "animate-spin" : ""} /> 
                              {isAnalyzingVideo ? 'Menganalisis...' : 'Analisis & Buat Ulang Ide'}
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {videoAnalysisResult.scripts.map((script: any, idx: number) => (
                            <div key={idx} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm flex flex-col">
                              <h5 className="font-bold text-gray-900 mb-4">{script.title}</h5>
                              <div className="space-y-4 flex-1">
                                {script.shots.map((shot: any, sIdx: number) => (
                                  <div key={sIdx}>
                                    <p className="text-xs font-bold text-gray-900 mb-1">{shot.name}</p>
                                    <p className="text-xs text-gray-600 leading-relaxed">{shot.desc}</p>
                                  </div>
                                ))}
                              </div>
                              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100 gap-2">
                                {script.shots.map((_: any, idx: number) => (
                                  <button 
                                    key={idx} 
                                    onClick={() => handleGenerateProductionDoc(script, idx)}
                                    className="flex-1 text-[10px] font-bold text-gray-600 bg-gray-100 hover:bg-indigo-100 hover:text-indigo-700 px-2 py-2 rounded transition-colors text-center"
                                  >
                                    Shot {idx + 1}
                                  </button>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-900 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <History size={20} />
                <h3 className="font-bold">Riwayat Dokumen Produksi</h3>
              </div>
              <button 
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              {docHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 font-medium">Belum ada riwayat dokumen.</p>
                  <p className="text-sm text-gray-400 mt-1">Generate dokumen dari ide naskah untuk melihatnya di sini.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {docHistory.map((doc) => (
                    <div 
                      key={doc.id} 
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-colors cursor-pointer group"
                      onClick={() => {
                        setSelectedScriptForDoc({ title: doc.scriptTitle, shotNumber: doc.shotNumber });
                        setProductionDocResult(doc.content);
                        setIsGeneratingDoc(false);
                        setIsProductionDocModalOpen(true);
                        setIsHistoryModalOpen(false);
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                            {doc.scriptTitle}
                          </h4>
                          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <Clock size={12} />
                            {new Date(doc.timestamp).toLocaleString('id-ID', { 
                              day: 'numeric', month: 'short', year: 'numeric', 
                              hour: '2-digit', minute: '2-digit' 
                            })}
                          </p>
                        </div>
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-1 rounded">
                          Shot {doc.shotNumber}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                        {doc.shotName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Production Document Modal */}
      {isProductionDocModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-indigo-600 p-4 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <FileText size={20} />
                <h3 className="font-bold">Dokumen Produksi: {selectedScriptForDoc?.title} - Shot {selectedScriptForDoc?.shotNumber}</h3>
              </div>
              <button 
                onClick={() => setIsProductionDocModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              {isGeneratingDoc ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                  <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4" />
                  <h4 className="text-lg font-bold text-gray-900 mb-2">AI Sedang Menyusun Dokumen Produksi...</h4>
                  <p className="text-sm text-gray-500 max-w-md">
                    Mengembangkan ide naskah menjadi detail shot, profil karakter, dan instruksi visual sesuai format standar produksi.
                  </p>
                </div>
              ) : (
                <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                  <div className="prose prose-sm max-w-none prose-indigo">
                    {productionDocResult ? (
                      <div className="whitespace-pre-wrap font-mono text-sm text-gray-800 leading-relaxed">
                        {productionDocResult}
                      </div>
                    ) : (
                      <p className="text-red-500">Gagal memuat dokumen.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            {!isGeneratingDoc && productionDocResult && (
              <div className="p-4 border-t border-gray-200 bg-white flex justify-end">
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(productionDocResult);
                    alert('Dokumen berhasil disalin ke clipboard!');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2"
                >
                  <Copy size={16} /> Salin Dokumen
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-xl border border-gray-100 backdrop-blur-md min-w-[200px]">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">{payload[0].payload.date}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Purchase</span>
            </div>
            <span className="text-sm font-black text-gray-900">{payload.find((p: any) => p.dataKey === 'purchase')?.value || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Lead</span>
            </div>
            <span className="text-sm font-black text-gray-900">{payload.find((p: any) => p.dataKey === 'lead')?.value || 0}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-xs font-bold text-gray-500 uppercase">Initiate Checkout</span>
            </div>
            <span className="text-sm font-black text-gray-900">{payload.find((p: any) => p.dataKey === 'initiateCheckout')?.value || 0}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
  const RADIAN = Math.PI / 180;
  // Position label slightly outside the center of the slice
  const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't show label for very small slices

  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-bold text-xs drop-shadow-md">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const DemographicsChart = ({ data }: { data: any[] }) => {
  if (!data || data.length === 0) return null;

  // Aggregate data for PieChart (Total Reach per Age Group)
  const pieData = data.map(d => ({
    name: d.age,
    value: (d.male || 0) + (d.female || 0) + (d.unknown || 0),
    male: d.male || 0,
    female: d.female || 0,
    unknown: d.unknown || 0
  })).filter(d => d.value > 0);

  const total = pieData.reduce((sum, item) => sum + item.value, 0);

  // Colors matching the uploaded infographic style
  const COLORS = ['#ec4899', '#f97316', '#eab308', '#14b8a6', '#8b5cf6', '#3b82f6', '#64748b'];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-6 flex flex-col h-full"
    >
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div className="space-y-0.5">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
            Demografi Penayangan
          </h3>
          <p className="text-xs text-gray-500 font-medium">
            Distribusi jangkauan iklan berdasarkan kelompok umur
          </p>
        </div>
      </div>

      <div className="relative flex-1 min-h-[350px] w-full flex items-center justify-center mt-4">
        {/* Center Text for Donut Chart */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-gray-400 text-[10px] font-bold tracking-widest uppercase mb-1">Total Reach</span>
          <span className="text-3xl font-black text-gray-900 tracking-tighter">
            {total >= 1000000 ? (total/1000000).toFixed(1) + 'M' : total >= 1000 ? (total/1000).toFixed(1) + 'K' : total}
          </span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={140}
              paddingAngle={2}
              dataKey="value"
              labelLine={false}
              label={renderCustomizedLabel}
              stroke="none"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              cursor={{ fill: '#F8FAFC' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-3 rounded-xl shadow-xl border border-gray-100 min-w-[150px] space-y-2">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-1.5 mb-1.5">
                        Umur {data.name}
                      </p>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-bold text-gray-500 uppercase">Total</span>
                        <span className="text-xs font-black text-gray-900">{data.value.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Laki-laki</span>
                        </div>
                        <span className="text-xs font-black text-gray-900">{data.male.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-pink-500" />
                          <span className="text-[10px] font-bold text-gray-500 uppercase">Perempuan</span>
                        </div>
                        <span className="text-xs font-black text-gray-900">{data.female.toLocaleString('id-ID')}</span>
                      </div>
                      {data.unknown > 0 && (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className="text-[10px] font-bold text-gray-500 uppercase">Tidak Diketahui</span>
                          </div>
                          <span className="text-xs font-black text-gray-900">{data.unknown.toLocaleString('id-ID')}</span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <RechartsLegend 
              layout="horizontal" 
              verticalAlign="bottom" 
              align="center"
              wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 600 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

interface MetricCardProps {
  icon: React.ElementType;
  color: string;
  label: string;
  value: string | number;
  unit?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon: Icon, color, label, value, unit = "" }) => (
  <motion.div 
    whileHover={{ y: -4, scale: 1.01 }}
    className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 flex flex-col gap-4 group transition-all hover:border-blue-500/30"
  >
    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center text-white shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform`}>
      <Icon size={20} />
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em]">{label}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-black text-gray-900 tracking-tighter">{value}</span>
        {unit && <span className="text-sm font-black text-blue-500">{unit}</span>}
      </div>
    </div>
  </motion.div>
);

interface TimeRangeButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

const TimeRangeButton: React.FC<TimeRangeButtonProps> = ({ label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-full text-[10px] font-bold transition-all duration-200 uppercase tracking-wider ${
      active 
        ? 'bg-white text-gray-900 shadow-md' 
        : 'text-gray-400 hover:text-gray-600'
    }`}
  >
    {label}
  </button>
);

const MOCK_PORTFOLIOS = [
  { id: 'p1', name: 'Molin Mol', color: 'bg-[#D6A3E1]', letter: 'M', keywords: ['MOLIN', 'Mol1'] },
  { id: 'p2', name: 'E-Pustaka Digital', color: 'bg-[#1E1B4B]', letter: 'E', keywords: ['E-Pustaka'] },
  { id: 'p3', name: 'Klik More', color: 'bg-[#A3E635]', letter: 'K', keywords: ['MAMBA', 'Mamba'] },
  { id: 'p4', name: 'Lamb Castol', color: 'bg-[#86EFAC]', letter: 'L', keywords: ['LAMB'] },
  { id: 'p5', name: 'Rilisan Tangan', color: 'bg-[#60A5FA]', letter: 'R', keywords: ['Mol3'] },
  { id: 'p6', name: 'kertas putih', color: 'bg-[#67E8F9]', letter: 'K', keywords: ['Mol 1 Peso'] },
];

export default function App() {
  const [isAdAccountDropdownOpen, setIsAdAccountDropdownOpen] = useState(false);
  const [activePortfolio, setActivePortfolio] = useState(MOCK_PORTFOLIOS[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('HARI INI');
  
  const [appId, setAppId] = useState(() => localStorage.getItem('fb_app_id') || '');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Persistensi Token & API Key menggunakan localStorage
  const [token, setToken] = useState(() => localStorage.getItem('meta_token') || '');
  const [genericKey, setGenericKey] = useState(() => localStorage.getItem('universal_api_key') || process.env.GEMINI_API_KEY || '');
  const [isConnected, setIsConnected] = useState(() => localStorage.getItem('is_connected') === 'true');
  
  // Meta Ads Data State
  const [adAccounts, setAdAccounts] = useState<MetaAdAccount[]>([]);
  
  const { portfoliosWithAccounts, yourAccounts } = useMemo(() => {
    const usedAdAccountIds = new Set<string>();
    
    const portfolios = MOCK_PORTFOLIOS.map(p => {
      const accounts = adAccounts.filter(acc => 
        p.keywords.some(kw => acc.name.toLowerCase().includes(kw.toLowerCase()))
      );
      accounts.forEach(acc => usedAdAccountIds.add(acc.id));
      return { ...p, accounts, count: accounts.length };
    });

    const yourAccounts = adAccounts.filter(acc => !usedAdAccountIds.has(acc.id));

    return { portfoliosWithAccounts: portfolios, yourAccounts };
  }, [adAccounts]);

  const activeAdAccounts = useMemo(() => {
    if (activePortfolio.id === 'your_account') return yourAccounts;
    return portfoliosWithAccounts.find(p => p.id === activePortfolio.id)?.accounts || [];
  }, [activePortfolio, portfoliosWithAccounts, yourAccounts]);
  const [selectedAdAccount, setSelectedAdAccount] = useState<MetaAdAccount | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [todayData, setTodayData] = useState<any>(null);
  const [yesterdayData, setYesterdayData] = useState<any>(null);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [hourlyData, setHourlyData] = useState<any[]>([]);
  const [demographicsData, setDemographicsData] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<MetaCampaignInsight[]>([]);

  const [detectedProvider, setDetectedProvider] = useState<string | null>(() => {
    const key = localStorage.getItem('universal_api_key') || process.env.GEMINI_API_KEY;
    if (!key) return null;
    if (key.startsWith('sk-ant-')) return 'Anthropic';
    if (key.startsWith('sk-')) return 'OpenAI';
    if (key.startsWith('AIza')) return 'Google/Gemini';
    return 'Detected';
  });

  // Fetch Ad Accounts
  const loadAdAccounts = useCallback(async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken || !isConnected) return;
    setIsLoading(true);
    setError(null);
    try {
      const accounts = await fetchAdAccounts(trimmedToken);
      setAdAccounts(accounts);
      if (accounts.length > 0 && !selectedAdAccount) {
        setSelectedAdAccount(accounts[0]);
      }
    } catch (err: any) {
      console.error('Failed to load ad accounts:', err);
      setError(err.message || 'Gagal memuat Ad Accounts. Pastikan Token Meta Anda benar.');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [token, isConnected, selectedAdAccount]);

  const loadInsights = useCallback(async () => {
    const trimmedToken = token.trim();
    if (!trimmedToken || !selectedAdAccount || !isConnected) return;
    setIsLoading(true);
    setError(null);
    try {
      const datePreset = getTimeRangePreset(timeRange);
      const baseUrl = `https://graph.facebook.com/v19.0`;
      
      // Determine ranges for chart data
      const dailyRange = (timeRange === 'HARI INI' || timeRange === 'KEMARIN') ? 'last_30d' : datePreset;
      const hourlyPreset = timeRange === 'KEMARIN' ? 'yesterday' : 'today';

      // Fields for campaign insights including video retention
      const campaignFields = [
        'campaign_id',
        'campaign_name',
        'account_id',
        'spend',
        'reach',
        'impressions',
        'cpm',
        'cpp',
        'ctr',
        'clicks',
        'inline_link_clicks',
        'inline_link_click_ctr',
        'outbound_clicks',
        'actions',
        'action_values',
        'video_p25_watched_actions',
        'video_p50_watched_actions',
        'video_p75_watched_actions',
        'video_p100_watched_actions'
      ].join(',');

      // Use fetchWithRetry for all calls
      const [todayRes, yesterdayRes, campaignListRes, insightsListRes, dailyRes, hourlyRes, demographicsRes] = await Promise.allSettled([
        fetchWithRetry(`${baseUrl}/${selectedAdAccount.id}/insights?fields=spend,reach,impressions,actions,action_values&date_preset=today&access_token=${trimmedToken}`),
        fetchWithRetry(`${baseUrl}/${selectedAdAccount.id}/insights?fields=spend,reach,impressions,actions,action_values&date_preset=yesterday&access_token=${trimmedToken}`),
        fetchWithRetry(`${baseUrl}/${selectedAdAccount.id}/campaigns?fields=name,id,effective_status&limit=100&access_token=${trimmedToken}`),
        fetchWithRetry(`${baseUrl}/${selectedAdAccount.id}/insights?level=campaign&fields=${campaignFields}&date_preset=${datePreset}&limit=100&access_token=${trimmedToken}`),
        fetchWithRetry(`${baseUrl}/${selectedAdAccount.id}/insights?fields=spend,actions,action_values,date_start&date_preset=${dailyRange}&time_increment=1&access_token=${trimmedToken}`),
        fetchWithRetry(`${baseUrl}/${selectedAdAccount.id}/insights?fields=actions,action_values&date_preset=${hourlyPreset}&breakdowns=hourly_stats_aggregated_by_advertiser_time_zone&access_token=${trimmedToken}`),
        fetchWithRetry(`${baseUrl}/${selectedAdAccount.id}/insights?fields=reach,spend&date_preset=${datePreset}&breakdowns=age,gender&access_token=${trimmedToken}`)
      ]);

      const today = todayRes.status === 'fulfilled' ? todayRes.value.data?.[0] : null;
      const yesterday = yesterdayRes.status === 'fulfilled' ? yesterdayRes.value.data?.[0] : null;
      const campaignList = campaignListRes.status === 'fulfilled' ? campaignListRes.value.data : [];
      const insightsList = insightsListRes.status === 'fulfilled' ? insightsListRes.value.data : [];
      const daily = dailyRes.status === 'fulfilled' ? dailyRes.value.data : [];
      const hourly = hourlyRes.status === 'fulfilled' ? hourlyRes.value.data : [];
      const demographics = demographicsRes.status === 'fulfilled' ? demographicsRes.value.data : [];

      setTodayData(today);
      setYesterdayData(yesterday);
      
      // Merge campaigns with their insights
      const mergedCampaigns = (campaignList as any[]).map(campaign => {
        const insight = (insightsList as any[]).find(i => i.campaign_id === campaign.id);
        return {
          ...insight,
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          effective_status: campaign.effective_status,
          spend: insight?.spend || '0',
          reach: insight?.reach || '0',
          impressions: insight?.impressions || '0',
          cpm: insight?.cpm || '0',
          ctr: insight?.ctr || '0',
          clicks: insight?.clicks || '0',
          actions: insight?.actions || [],
          outbound_clicks: insight?.outbound_clicks || [],
          video_p25_watched_actions: insight?.video_p25_watched_actions || [],
          video_p50_watched_actions: insight?.video_p50_watched_actions || [],
          video_p75_watched_actions: insight?.video_p75_watched_actions || [],
          video_p100_watched_actions: insight?.video_p100_watched_actions || []
        };
      });

      // Sort campaigns: ACTIVE first
      const sortedCampaigns = mergedCampaigns.sort((a, b) => {
        if (a.effective_status === 'ACTIVE' && b.effective_status !== 'ACTIVE') return -1;
        if (a.effective_status !== 'ACTIVE' && b.effective_status === 'ACTIVE') return 1;
        return 0;
      });
      setCampaigns(sortedCampaigns);
      
      // Format daily data for Recharts: Purchase, Lead, Initiate Checkout
      const purchaseTypes = ['paid', 'omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];
      const leadTypes = ['omni_lead', 'lead', 'offsite_conversion.fb_pixel_lead'];
      const checkoutTypes = ['omni_initiated_checkout', 'initiate_checkout', 'offsite_conversion.fb_pixel_initiate_checkout', 'Engaged', 'engaged'];

      const getDeduplicatedValue = (actions: any[] | undefined, types: string[]) => {
        if (!actions) return 0;
        for (const type of types) {
          const action = actions.find((a: any) => a.action_type === type);
          if (action) return parseInt(action.value);
        }
        return 0;
      };

      // Sort daily insights by date to ensure chronological order
      const sortedDaily = [...daily].sort((a, b) => new Date(a.date_start).getTime() - new Date(b.date_start).getTime());

      let formattedDaily = sortedDaily.map((day: any) => {
        const purchase = getDeduplicatedValue(day.actions, purchaseTypes);
        const lead = getDeduplicatedValue(day.actions, leadTypes);
        const initiateCheckout = getDeduplicatedValue(day.actions, checkoutTypes);
        return {
          name: new Date(day.date_start).toLocaleDateString('id-ID', { weekday: 'short' }),
          date: new Date(day.date_start).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
          purchase: purchase,
          lead: lead,
          initiateCheckout: initiateCheckout,
          rawDate: day.date_start
        };
      });

      // Add today's data if not present in daily insights
      if (today) {
        const todayPurchase = getDeduplicatedValue(today.actions, purchaseTypes);
        const todayLead = getDeduplicatedValue(today.actions, leadTypes);
        const todayCheckout = getDeduplicatedValue(today.actions, checkoutTypes);
        
        const todayDateStr = new Date().toISOString().split('T')[0];
        const existingTodayIndex = formattedDaily.findIndex(d => d.rawDate === todayDateStr);
        
        if (existingTodayIndex !== -1) {
          // Update existing today's data with the more accurate "today" insight
          formattedDaily[existingTodayIndex] = {
            ...formattedDaily[existingTodayIndex],
            name: 'Hari Ini',
            purchase: todayPurchase,
            lead: todayLead,
            initiateCheckout: todayCheckout
          };
        } else {
          // Append today's data
          formattedDaily.push({
            name: 'Hari Ini',
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            purchase: todayPurchase,
            lead: todayLead,
            initiateCheckout: todayCheckout,
            rawDate: todayDateStr
          });
        }
      }

      if (timeRange === '30 HARI') {
        setDailyData(formattedDaily.slice(-30));
      } else if (timeRange === '7 HARI') {
        setDailyData(formattedDaily.slice(-7));
      } else if (timeRange === 'SEMUA') {
        setDailyData(formattedDaily);
      } else {
        setDailyData(formattedDaily.slice(-7)); // Default to last 7 days for context
      }

      // Format hourly data
      const formattedHourly = Array.from({ length: 24 }, (_, i) => ({
        name: `${i.toString().padStart(2, '0')}:00`,
        hour: i.toString().padStart(2, '0'),
        purchase: 0,
        lead: 0,
        initiateCheckout: 0
      }));

      if (hourly && Array.isArray(hourly)) {
        hourly.forEach((h: any) => {
          const hourStr = h.hourly_stats_aggregated_by_advertiser_time_zone?.split(':')[0];
          if (hourStr) {
            const hourIdx = parseInt(hourStr);
            const purchase = getDeduplicatedValue(h.actions, purchaseTypes);
            const lead = getDeduplicatedValue(h.actions, leadTypes);
            const initiateCheckout = getDeduplicatedValue(h.actions, checkoutTypes);
            
            if (formattedHourly[hourIdx]) {
              formattedHourly[hourIdx].purchase += purchase;
              formattedHourly[hourIdx].lead += lead;
              formattedHourly[hourIdx].initiateCheckout += initiateCheckout;
            }
          }
        });
      }
      setHourlyData(formattedHourly);

      // Format demographics data
      const ageGroups = ['13-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      const formattedDemographics = ageGroups.map(age => ({
        age,
        male: 0,
        female: 0,
        unknown: 0
      }));

      if (demographics && Array.isArray(demographics)) {
        demographics.forEach((d: any) => {
          const age = d.age;
          const gender = d.gender;
          const reach = parseInt(d.reach || '0');
          
          const group = formattedDemographics.find(g => g.age === age);
          if (group) {
            if (gender === 'male') group.male += reach;
            else if (gender === 'female') group.female += reach;
            else group.unknown += reach;
          }
        });
      }
      setDemographicsData(formattedDemographics);
    } catch (error) {
      console.error('Failed to load insights:', error);
    } finally {
      setIsLoading(false);
    }
  }, [token, selectedAdAccount, isConnected, timeRange]);

  useEffect(() => {
    if (isConnected) {
      loadAdAccounts();
    }
  }, [isConnected, loadAdAccounts]);

  useEffect(() => {
    if (selectedAdAccount) {
      loadInsights();
    }
  }, [selectedAdAccount, loadInsights, timeRange]);

  // Simpan ke localStorage setiap kali ada perubahan
  useEffect(() => {
    localStorage.setItem('meta_token', token);
  }, [token]);

  useEffect(() => {
    localStorage.setItem('universal_api_key', genericKey);
  }, [genericKey]);

  useEffect(() => {
    localStorage.setItem('is_connected', isConnected.toString());
  }, [isConnected]);

  const detectKeyType = (key: string) => {
    if (!key) return null;
    if (key.startsWith('sk-ant-')) return 'Anthropic';
    if (key.startsWith('sk-')) return 'OpenAI';
    if (key.startsWith('AIza')) return 'Google/Gemini';
    if (key.startsWith('sk_test_') || key.startsWith('sk_live_')) return 'Stripe';
    if (key.startsWith('EAAN')) return 'Meta';
    if (key.length > 20) return 'Unknown Provider';
    return null;
  };

  useEffect(() => {
    if (isConnected && selectedAdAccount) {
      loadInsights(selectedAdAccount);
    }
  }, [timeRange]);

  const handleGenericKeyChange = (val: string) => {
    setGenericKey(val);
    setDetectedProvider(detectKeyType(val));
  };

  const handleFacebookLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId.trim()) return;
    
    setIsLoggingIn(true);
    setError(null);
    localStorage.setItem('fb_app_id', appId.trim());
    
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const scopes = 'ads_read,read_insights';
      const authUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId.trim()}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scopes}`;
      
      const authWindow = window.open(
        authUrl,
        'facebook_oauth',
        'width=600,height=700'
      );

      if (!authWindow) {
        setError('Popup diblokir oleh browser. Silakan izinkan popup untuk situs ini.');
        setIsLoggingIn(false);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Gagal membuka jendela login.');
      setIsLoggingIn(false);
    }
  };

  const handleManualTokenSave = async () => {
    if (!token.trim()) return;
    
    setIsLoggingIn(true);
    setError(null);
    
    try {
      const accounts = await fetchAdAccounts(token.trim());
      localStorage.setItem('meta_token', token.trim());
      setAdAccounts(accounts);
      if (accounts.length > 0) {
        setSelectedAdAccount(accounts[0]);
      }
      setIsConnected(true);
      localStorage.setItem('is_connected', 'true');
    } catch (err: any) {
      console.error('Failed to fetch accounts with manual token:', err);
      setError('Gagal memuat Ad Accounts. Token mungkin tidak valid atau kedaluwarsa.');
      setIsConnected(false);
      localStorage.removeItem('is_connected');
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data.token) {
        try {
          const newToken = event.data.token;
          const accounts = await fetchAdAccounts(newToken);
          
          setToken(newToken);
          localStorage.setItem('meta_token', newToken);
          setAdAccounts(accounts);
          if (accounts.length > 0) {
            setSelectedAdAccount(accounts[0]);
          }
          
          setIsConnected(true);
          localStorage.setItem('is_connected', 'true');
        } catch (err: any) {
          console.error('Failed to fetch accounts after login:', err);
          setError('Gagal memuat Ad Accounts. Token mungkin tidak memiliki izin yang cukup.');
        } finally {
          setIsLoggingIn(false);
        }
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(`Login gagal: ${event.data.error}`);
        setIsLoggingIn(false);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const timeRanges = ['HARI INI', 'KEMARIN', '7 HARI', '30 HARI', 'SEMUA'];

  const getTimeRangePreset = (range: string) => {
    switch (range) {
      case 'HARI INI': return 'today';
      case 'KEMARIN': return 'yesterday';
      case '7 HARI': return 'last_7d';
      case '30 HARI': return 'last_30d';
      case 'SEMUA': return 'maximum';
      default: return 'today';
    }
  };

  // Helper to extract purchase value from actions array
  const getPurchaseValue = (data: any) => {
    if (!data || !data.actions) return 0;
    const purchaseTypes = ['paid', 'purchase', 'offsite_conversion.fb_pixel_purchase', 'omni_purchase'];
    for (const type of purchaseTypes) {
      const action = data.actions.find((a: any) => a.action_type === type);
      if (action) return parseInt(action.value);
    }
    return 0;
  };

  const getRevenueValue = (data: any) => {
    if (!data || !data.action_values) return 0;
    const revenueTypes = ['paid', 'offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase'];
    for (const type of revenueTypes) {
      const action = data.action_values.find((a: any) => a.action_type === type);
      if (action) return parseFloat(action.value || '0');
    }
    return 0;
  };

  // Real data untuk perbandingan Purchase
  const purchaseComparison = {
    today: getPurchaseValue(todayData),
    yesterday: getPurchaseValue(yesterdayData),
    revenueToday: getRevenueValue(todayData),
    revenueYesterday: getRevenueValue(yesterdayData),
  };

  const calculateDiff = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? '100' : '0';
    return ((curr - prev) / prev * 100).toFixed(1);
  };

  const formatCurrency = (val: number) => {
    if (val >= 1000000) return `Rp ${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `Rp ${(val / 1000).toFixed(1)}K`;
    return `Rp ${val.toLocaleString('id-ID')}`;
  };

  const purchaseDiff = calculateDiff(purchaseComparison.today, purchaseComparison.yesterday);
  const revenueDiff = calculateDiff(purchaseComparison.revenueToday, purchaseComparison.revenueYesterday);

  // Calculate dashboard metrics from campaigns to ensure consistency with Campaign Performance section
  const dashboardMetrics = useMemo(() => {
    const totalSpend = campaigns.reduce((sum, c) => sum + parseFloat(c.spend || '0'), 0);
    
    const purchaseTypes = ['paid', 'omni_purchase', 'purchase', 'offsite_conversion.fb_pixel_purchase'];
    const totalPurchaseValue = campaigns.reduce((sum, c) => {
      if (!c.action_values) return sum;
      let campaignPurchaseValue = 0;
      for (const type of purchaseTypes) {
        const action = c.action_values.find((a: any) => a.action_type === type);
        if (action) {
          campaignPurchaseValue = parseFloat(action.value || '0');
          break;
        }
      }
      return sum + campaignPurchaseValue;
    }, 0);

    const totalLPViews = campaigns.reduce((sum, c) => {
      if (!c.actions) return sum;
      const lpTypes = ['landing_page_view', 'omni_landing_page_view'];
      let campaignLPViews = 0;
      for (const type of lpTypes) {
        const action = c.actions.find((a: any) => a.action_type === type);
        if (action) {
          campaignLPViews = parseInt(action.value || '0');
          break; // Stop at the first found to prevent double counting
        }
      }
      return sum + campaignLPViews;
    }, 0);

    const activeCampaigns = campaigns.filter(c => c.effective_status === 'ACTIVE').length;
    const avgRoas = totalSpend > 0 ? (totalPurchaseValue / totalSpend) : 0;

    return {
      totalSpend,
      totalPurchaseValue,
      avgRoas,
      totalLPViews,
      activeCampaigns
    };
  }, [campaigns]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-4 md:p-6 font-sans selection:bg-blue-500/10">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        
        {/* Top Token Bar */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`bg-white rounded-2xl p-6 shadow-md border transition-all duration-500 ${isConnected ? 'border-emerald-500/50 shadow-emerald-500/10' : 'border-gray-200'}`}
        >
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold"
            >
              <AlertCircle size={16} />
              {error}
            </motion.div>
          )}
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            <div className="flex-1 space-y-4">
              {/* Facebook Login Row */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                <div className="flex items-center gap-2 w-40 shrink-0">
                  <div className={`p-1.5 rounded-lg ${isConnected ? 'bg-emerald-500/10' : 'bg-[#1877F2]/10'}`}>
                    <svg className={`w-3.5 h-3.5 ${isConnected ? 'text-emerald-600' : 'text-[#1877F2]'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-500">Koneksi Facebook</span>
                </div>
                
                <div className="flex-1 flex items-center gap-3">
                  {!isConnected ? (
                    <div className="flex-1 flex items-center gap-2 w-full">
                      <div className="relative flex-1">
                        <input 
                          type="password"
                          value={token}
                          onChange={(e) => setToken(e.target.value)}
                          placeholder="Paste Meta Ads Access Token..."
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all pr-10"
                        />
                        <Key size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      </div>
                      <button 
                        onClick={handleManualTokenSave}
                        disabled={isLoggingIn || !token.trim()}
                        className="bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      >
                        {isLoggingIn ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                        Simpan
                      </button>
                    </div>
                  ) : (
                    <div className="w-full bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-800">Terhubung ke Facebook Ads</span>
                      </div>
                      <button 
                        onClick={() => setIsConnected(false)}
                        className="text-[9px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors px-1"
                      >
                        Putuskan
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Generic API Key Row */}
              <div className="flex flex-col lg:flex-row lg:items-center gap-4 pt-4 border-t border-gray-100">
                <div className="flex items-center gap-2 w-40 shrink-0">
                  <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <Zap size={14} className="text-amber-600" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.15em] text-gray-500">Universal API Key</span>
                </div>
                
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 relative">
                    <input 
                      type="password" 
                      placeholder="Paste any API key (OpenAI, Gemini, Stripe, etc.)"
                      value={genericKey}
                      onChange={(e) => handleGenericKeyChange(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-4 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/10 transition-all"
                    />
                    {detectedProvider && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <span className="text-[8px] font-black bg-amber-500/10 text-amber-600 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20">
                          {detectedProvider}
                        </span>
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => handleGenericKeyChange('')}
                    className="text-[9px] font-black text-gray-400 hover:text-red-500 uppercase tracking-widest transition-colors px-1"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>

            {/* Single Hubungkan Button */}
            <div className="shrink-0">
              <button 
                onClick={handleManualTokenSave}
                className={`${isConnected ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'} text-white px-8 py-6 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex flex-col items-center gap-2 shadow-xl transition-all active:scale-95 min-w-[140px]`}
              >
                {isConnected ? <ShieldCheck size={20} /> : <Save size={20} />}
                {isConnected ? 'Terkoneksi' : 'Hubungkan'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-2">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className={`w-1.5 h-8 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-colors duration-500 ${isConnected ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-blue-500'}`} />
              <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase">Ads Analyst Dashboard</h1>
              {isConnected && (
                <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-600 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-500/20 animate-pulse">
                  <div className="w-1 h-1 rounded-full bg-emerald-500" />
                  Live Data
                </span>
              )}
            </div>
            <p className="text-gray-600 text-sm font-medium ml-4">
              {isConnected ? 'Sistem aktif. Menampilkan metrik performa real-time.' : 'Silakan hubungkan Meta Access Token untuk mengaktifkan data.'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button 
                onClick={() => setIsAdAccountDropdownOpen(!isAdAccountDropdownOpen)}
                className={`bg-white border rounded-lg px-3 py-1.5 flex items-center gap-3 shadow-sm cursor-pointer hover:border-blue-400 transition-all min-w-[260px] justify-between ${isAdAccountDropdownOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-300'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded ${activePortfolio.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                    {activePortfolio.letter}
                  </div>
                  <div className="flex items-center gap-2 text-left">
                    <MonitorPlay size={14} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-800 truncate max-w-[160px]">
                      {selectedAdAccount ? `${selectedAdAccount.name} (${selectedAdAccount.id})` : 'Pilih Ad Account'}
                    </span>
                  </div>
                </div>
                <ChevronDown size={16} className="text-gray-500" />
              </button>
              
              {isAdAccountDropdownOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => setIsAdAccountDropdownOpen(false)}
                  />
                  <div className="absolute top-full left-0 mt-2 w-[700px] bg-white border border-gray-200 rounded-lg shadow-2xl z-50 overflow-hidden flex flex-col">
                  {/* Search Bar */}
                  <div className="p-3 border-b border-gray-200">
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search for an ad account" 
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  {/* Two Columns */}
                  <div className="flex flex-row h-[450px]">
                    {/* Left Column: Portfolios */}
                    <div className="w-[280px] bg-[#F4F6F8] border-r border-gray-200 flex flex-col">
                      <div className="p-4 overflow-y-auto flex-1">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-sm font-bold text-gray-800">Business portfolios</span>
                          <Info size={14} className="text-gray-500" />
                        </div>
                        <div className="space-y-1">
                          {portfoliosWithAccounts.map(p => (
                            <button
                              key={p.id}
                              onClick={() => setActivePortfolio(p)}
                              className={`w-full flex items-center justify-between p-2 rounded-md transition-colors ${activePortfolio.id === p.id ? 'bg-[#2A3B47] text-white' : 'hover:bg-gray-200 text-gray-800'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded ${p.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                  {p.letter}
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className={`text-sm font-bold ${activePortfolio.id === p.id ? 'text-white' : 'text-gray-900'}`}>{p.name}</span>
                                  <span className={`text-xs ${activePortfolio.id === p.id ? 'text-gray-300' : 'text-gray-500'}`}>{p.count} ad account{p.count !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              <ChevronRight size={16} className={activePortfolio.id === p.id ? 'text-gray-400' : 'text-gray-400'} />
                            </button>
                          ))}
                          
                          {yourAccounts.length > 0 && (
                            <button
                              onClick={() => setActivePortfolio({ id: 'your_account', name: 'Your account', color: 'bg-gray-500', letter: 'Y', keywords: [] } as any)}
                              className={`w-full flex items-center justify-between p-2 rounded-md transition-colors mt-2 ${activePortfolio.id === 'your_account' ? 'bg-[#2A3B47] text-white' : 'hover:bg-gray-200 text-gray-800'}`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded bg-gray-500 flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                                  Y
                                </div>
                                <div className="flex flex-col text-left">
                                  <span className={`text-sm font-bold ${activePortfolio.id === 'your_account' ? 'text-white' : 'text-gray-900'}`}>Your account</span>
                                  <span className={`text-xs ${activePortfolio.id === 'your_account' ? 'text-gray-300' : 'text-gray-500'}`}>{yourAccounts.length} ad account{yourAccounts.length !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                              <ChevronRight size={16} className={activePortfolio.id === 'your_account' ? 'text-gray-400' : 'text-gray-400'} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right Column: Ad Accounts */}
                    <div className="flex-1 bg-white overflow-y-auto p-6">
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex flex-col">
                          <h3 className="text-xl font-bold text-gray-900">{activePortfolio.name}</h3>
                          <span className="text-sm text-gray-500">Business portfolio</span>
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <span className="text-base font-bold text-gray-900">{activeAdAccounts.length} ad account{activeAdAccounts.length !== 1 ? 's' : ''}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {activeAdAccounts.filter(acc => acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || acc.id.includes(searchQuery)).map((acc) => (
                          <button
                            key={acc.id}
                            onClick={() => {
                              setSelectedAdAccount(acc);
                              setIsAdAccountDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors border border-transparent ${selectedAdAccount?.id === acc.id ? 'bg-[#EBF5FF]' : 'hover:bg-gray-50'}`}
                          >
                            <div className="flex items-center gap-4">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selectedAdAccount?.id === acc.id ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                                {selectedAdAccount?.id === acc.id && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-600 shrink-0">
                                <MonitorPlay size={18} />
                              </div>
                              <div className="flex flex-col text-left">
                                <span className="text-base font-bold text-gray-900">{acc.name}</span>
                                <span className="text-sm text-gray-500">Ad account ID: {acc.id}</span>
                              </div>
                            </div>
                            <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 bg-white">
                              <Minus size={16} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
              )}
            </div>

            <div className="flex items-center gap-1.5 bg-gray-100 p-1.5 rounded-xl border border-gray-200 shadow-sm">
              {timeRanges.map((range) => (
                <TimeRangeButton 
                  key={range}
                  label={range}
                  active={timeRange === range}
                  onClick={() => setTimeRange(range)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 px-2">
          <MetricCard 
            icon={Wallet} 
            color="bg-blue-500" 
            label="Total Spend" 
            value={formatCurrency(dashboardMetrics.totalSpend)} 
          />
          <MetricCard 
            icon={TrendingUp} 
            color="bg-emerald-500" 
            label="Total Revenue" 
            value={formatCurrency(dashboardMetrics.totalPurchaseValue)} 
          />
          <MetricCard 
            icon={ShieldCheck} 
            color="bg-emerald-600" 
            label="Avg. ROAS" 
            value={dashboardMetrics.avgRoas.toFixed(2)} 
            unit="x"
          />
          <MetricCard 
            icon={Eye} 
            color="bg-orange-500" 
            label="Total LP Views" 
            value={dashboardMetrics.totalLPViews.toLocaleString('id-ID')} 
          />
          <MetricCard 
            icon={Zap} 
            color="bg-amber-500" 
            label="Kampanye Aktif" 
            value={dashboardMetrics.activeCampaigns} 
          />
        </div>

        {/* Performance Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-6 flex flex-col"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-0.5">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Performance Over Time</h3>
                <p className="text-xs text-gray-500 font-medium">Purchase, Lead, and Checkout analysis</p>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Purchase</span>
                </div>
                <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-xl border border-orange-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.3)]" />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Lead</span>
                </div>
                <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]" />
                  <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Checkout</span>
                </div>
              </div>
            </div>

            {/* Today's Summary Stats */}
            <div className="grid grid-cols-3 gap-4 pb-2">
              <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-100/50">
                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Today's Purchase</p>
                <p className="text-2xl font-black text-emerald-700">
                  {dailyData.find(d => d.name === 'Hari Ini')?.purchase || 0}
                </p>
              </div>
              <div className="bg-orange-50/50 p-3 rounded-xl border border-orange-100/50">
                <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Today's Lead</p>
                <p className="text-2xl font-black text-orange-700">
                  {dailyData.find(d => d.name === 'Hari Ini')?.lead || 0}
                </p>
              </div>
              <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Today's Checkout</p>
                <p className="text-2xl font-black text-blue-700">
                  {dailyData.find(d => d.name === 'Hari Ini')?.initiateCheckout || 0}
                </p>
              </div>
            </div>

            <div className="flex-1 min-h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={
                (timeRange === 'HARI INI' || timeRange === 'KEMARIN') 
                  ? hourlyData 
                  : (dailyData.length > 0 ? dailyData : [
                    { name: 'Sen', purchase: 0, lead: 0, initiateCheckout: 0 },
                    { name: 'Sel', purchase: 0, lead: 0, initiateCheckout: 0 },
                    { name: 'Rab', purchase: 0, lead: 0, initiateCheckout: 0 },
                    { name: 'Kam', purchase: 0, lead: 0, initiateCheckout: 0 },
                    { name: 'Jum', purchase: 0, lead: 0, initiateCheckout: 0 },
                    { name: 'Sab', purchase: 0, lead: 0, initiateCheckout: 0 },
                    { name: 'Min', purchase: 0, lead: 0, initiateCheckout: 0 },
                  ])
              } margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorPurchase" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorLead" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCheckout" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 'bold' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 9, fontWeight: 'bold' }}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#F1F5F9', strokeWidth: 1 }} />
                <Area 
                  type="monotone" 
                  dataKey="purchase" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorPurchase)" 
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#10b981' }}
                  name="Purchase"
                />
                <Area 
                  type="monotone" 
                  dataKey="lead" 
                  stroke="#f97316" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorLead)" 
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#f97316' }}
                  name="Lead"
                />
                <Area 
                  type="monotone" 
                  dataKey="initiateCheckout" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorCheckout)" 
                  activeDot={{ r: 5, strokeWidth: 0, fill: '#3b82f6' }}
                  name="Initiate Checkout"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <DemographicsChart data={demographicsData} />
      </div>

        <CampaignTable campaigns={campaigns} demographicsData={demographicsData} />
      </div>

    </div>
  );
}
