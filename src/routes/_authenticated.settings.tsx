import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Bell, LogOut, Trash2, ChevronRight, Loader2, BadgeCheck,
  Eye, EyeOff, Ban, Crown, Check, Compass, Download, Zap, Mail, Phone,
  MapPin, Heart, Star, Plane, Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useSettings } from '@/hooks/useSettings';
import { useSubscription } from '@/hooks/useSubscription';
import { useGeolocation } from '@/hooks/useGeolocation';
import { useToast } from '@/hooks/use-toast';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { VerificationModal } from '@/components/VerificationModal';
import { PremiumBadge } from '@/components/PremiumBadge';
import { SettingsListSkeleton } from '@/components/skeletons/AppSkeletons';
import { BlockedUsersModal } from '@/components/BlockedUsersModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { PhoneVerificationModal } from '@/components/PhoneVerificationModal';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { InstallModal } from '@/components/landing/InstallModal';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { PaywallSheet } from '@/components/paywall/PaywallSheet';

export const Route = createFileRoute('/_authenticated/settings')({
  head: () => ({
    meta: [
      { title: 'Definições — Hunie' },
      { name: 'description', content: 'Gere a tua conta, descoberta e privacidade.' },
    ],
  }),
  component: SettingsPage,
});

type VisibilityMode = 'standard' | 'hidden';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function SectionHeader({ icon: Icon, label, accessory }: { icon?: any; label: string; accessory?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      {Icon && <Icon className="h-5 w-5 text-flame" />}
      <span
        className="text-[22px] tracking-tight text-foreground"
        style={{ fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif', fontWeight: 900 }}
      >
        {label}
      </span>
      {accessory}
    </div>
  );
}


function SettingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const { profile, updateProfile, deleteAccount } = useProfile();
  const { settings, updateSettings, loading } = useSettings();
  const { isPremium, entitlements, subscription } = useSubscription();
  const membershipTier = subscription.membershipTier;
  const {
    permissionState: locationPermission,
    requestPermission: requestLocationPermission,
    loading: locationLoading,
  } = useGeolocation(false);

  const tierLabel = membershipTier === 'elite' ? 'Elite'
    : membershipTier === 'plus' ? 'Plus'
    : membershipTier === 'select' ? 'Select' : 'Membership';

  const [paywallOpen, setPaywallOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const goShop = (tab?: 'boost' | 'super_like') =>
    navigate({ to: '/shop', search: tab ? { tab } : {} });
  const goUpgrade = () => setPaywallOpen(true);
  const soon = () => toast({ title: 'Em breve' });
  const goBack = () => navigate({ to: '/profile' });

  const pwa = usePWAInstall();
  const handleInstallApp = () => {
    if (pwa.installed) {
      toast({ title: 'Já instalada', description: 'Estás a usar a app instalada.' });
      return;
    }
    setInstallOpen(true);
  };

  const handleEnableLocation = async () => {
    if (locationPermission === 'denied') {
      toast({
        title: 'Localização bloqueada',
        description: 'Ativa nas definições do navegador e tenta de novo.',
        variant: 'destructive',
      });
      return;
    }
    requestLocationPermission();
  };

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [interestedSheet, setInterestedSheet] = useState(false);

  const interestedIn = profile?.interested_in ?? [];
  const interestedKey: 'men' | 'women' | 'everyone' | null =
    interestedIn.length === 0 ? null
      : interestedIn.length >= 3 ? 'everyone'
      : interestedIn[0] === 'man' ? 'men'
      : interestedIn[0] === 'woman' ? 'women'
      : 'everyone';
  const interestedLabel =
    interestedKey === 'men' ? 'Homens'
      : interestedKey === 'women' ? 'Mulheres'
      : interestedKey === 'everyone' ? 'Todos'
      : 'Selecionar';
  const setInterested = async (key: 'men' | 'women' | 'everyone') => {
    const map = { men: ['man'], women: ['woman'], everyone: ['man', 'woman', 'nonbinary'] };
    try {
      await updateProfile({ interested_in: map[key] });
      setInterestedSheet(false);
      toast({ title: 'Preferência guardada' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível guardar', variant: 'destructive' });
    }
  };

  const initialMode: VisibilityMode = profile?.is_paused ? 'hidden' : 'standard';
  const [visibilityMode, setVisibilityMode] = useState<VisibilityMode>(initialMode);
  useEffect(() => {
    setVisibilityMode(profile?.is_paused ? 'hidden' : 'standard');
  }, [profile?.is_paused]);

  const [liveDistance, setLiveDistance] = useState<number | null>(null);
  const [liveAge, setLiveAge] = useState<[number, number] | null>(null);

  const distanceValue = liveDistance ?? settings?.distance_radius ?? 50;
  const ageMin = liveAge?.[0] ?? settings?.age_min ?? 18;
  const ageMax = liveAge?.[1] ?? settings?.age_max ?? 50;

  const handleDistanceChange = async (value: number[]) => {
    try { setLiveDistance(null); await updateSettings({ distance_radius: value[0] }); }
    catch { toast({ title: 'Erro', description: 'Não foi possível guardar', variant: 'destructive' }); }
  };
  const handleAgeChange = async (value: number[]) => {
    try { setLiveAge(null); await updateSettings({ age_min: value[0], age_max: value[1] }); }
    catch { toast({ title: 'Erro', description: 'Não foi possível guardar', variant: 'destructive' }); }
  };
  const handleNotificationsChange = async (enabled: boolean) => {
    try { await updateSettings({ notifications_enabled: enabled }); }
    catch { toast({ title: 'Erro', description: 'Não foi possível guardar', variant: 'destructive' }); }
  };

  const [liveMinPhotos, setLiveMinPhotos] = useState<number | null>(null);
  const minPhotosValue = liveMinPhotos ?? settings?.min_photos ?? 1;
  const requireBio = settings?.require_bio ?? false;

  const handleMinPhotosChange = async (value: number[]) => {
    if (!isPremium) return goUpgrade();
    try { setLiveMinPhotos(null); await updateSettings({ min_photos: value[0] }); }
    catch { toast({ title: 'Erro', description: 'Não foi possível guardar', variant: 'destructive' }); }
  };
  const handleRequireBioChange = async (enabled: boolean) => {
    if (!isPremium) return goUpgrade();
    try { await updateSettings({ require_bio: enabled }); }
    catch { toast({ title: 'Erro', description: 'Não foi possível guardar', variant: 'destructive' }); }
  };

  const handleVisibilityChange = async (mode: VisibilityMode) => {
    setSaving(true);
    try {
      await updateProfile({ is_paused: mode === 'hidden' });
      setVisibilityMode(mode);
      toast({
        title: mode === 'hidden' ? 'Perfil oculto' : 'Perfil visível',
        description: mode === 'hidden' ? 'O teu perfil não aparecerá na descoberta' : 'O teu perfil está novamente visível',
      });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar', variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleIncognitoChange = async (enabled: boolean) => {
    if (enabled && !entitlements.invisibleMode) {
      toast({ title: 'Modo Anónimo é exclusivo Elite', description: 'Faz upgrade para Hunie Elite para controlar quem te vê.' });
      return;
    }
    try {
      await updateProfile({ is_incognito: enabled });
      toast({
        title: enabled ? 'Modo Anónimo ativo' : 'Modo Anónimo desativado',
        description: enabled ? 'Só apareces a quem tu deste like.' : 'Voltas a aparecer na descoberta.',
      });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar', variant: 'destructive' });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      window.location.href = "/auth";
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast({ title: 'Conta eliminada', description: 'A tua conta foi eliminada com sucesso.' });
      window.location.href = "/auth";
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Não foi possível eliminar a conta',
        variant: 'destructive',
      });
    } finally { setDeleting(false); }
  };

  if (loading) {
    return (
      <div className="flex-1 bg-background pt-12">
        <SettingsListSkeleton count={8} />
      </div>
    );
  }

  return (
    <div
      className="h-[100dvh] overflow-y-auto overflow-x-hidden bg-background overscroll-y-contain"
      style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-y' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b border-white/[0.06]"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          background:
            'linear-gradient(180deg, rgba(16,14,22,0.92) 0%, rgba(16,14,22,0.78) 100%)',
          backdropFilter: 'blur(18px) saturate(140%)',
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 h-[140px] w-[360px] -translate-x-1/2 rounded-full"
          style={{
            background:
              'radial-gradient(closest-side, color-mix(in oklab, var(--brand-pink) 18%, transparent) 0%, transparent 70%)',
            filter: 'blur(24px)',
          }}
        />
        <div className="relative flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <motion.button
              onClick={goBack}
              className="hunie-glass-btn grid h-10 w-10 place-items-center rounded-2xl"
              whileTap={{ scale: 0.9 }}
              aria-label="Voltar"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </motion.button>
            <h2
              className="text-[28px] tracking-tight text-foreground"
              style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}
            >
              Definições
            </h2>
          </div>
          <motion.button
            onClick={goBack}
            className="rounded-full px-4 py-2 text-[13px] font-semibold bg-white/10 text-foreground border border-white/15 hover:bg-white/15"
            whileTap={{ scale: 0.95 }}
          >
            Concluído
          </motion.button>
        </div>
      </div>


      <motion.div className="px-4" style={{ paddingBottom: '24px' }}
        variants={containerVariants} initial="hidden" animate="show"
      >
        {/* Plan hero cards */}
        <motion.div className="mt-6 space-y-3" variants={itemVariants}>
          {([
            { tier: 'elite' as const, name: 'Elite', tagline: 'Sê visto primeiro. Prioridade máxima e ferramentas exclusivas.', accent: '#C9A86A',
              icon: <Crown className="w-5 h-5" style={{ color: '#C9A86A' }} fill="#C9A86A" /> },
            { tier: 'plus' as const, name: 'Plus', tagline: 'Likes ilimitados, vê quem te curtiu e mais controlo.', accent: 'var(--brand-purple)',
              icon: <Sparkles className="w-5 h-5 text-brand-purple" /> },
            { tier: 'select' as const, name: 'Select', tagline: 'A porta de entrada. Comunidade verificada, sem distrações.', accent: 'var(--foreground)',
              icon: <BadgeCheck className="w-5 h-5 text-foreground" /> },
          ]).map(({ tier, name, tagline, accent, icon }) => {
            const isCurrent = isPremium && membershipTier === tier;
            return (
              <motion.button key={tier} onClick={() => goUpgrade()}
                className="w-full hunie-card p-5 flex flex-col items-center gap-1.5 relative overflow-hidden"
                whileTap={{ scale: 0.98 }}
                style={isCurrent ? { borderColor: accent } : undefined}
              >
                {isCurrent && (
                  <span className="absolute top-3 right-3 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider text-background"
                    style={{ backgroundColor: accent }}>ATUAL</span>
                )}
                <div className="flex items-center gap-2">
                  {icon}
                  <span className="text-[28px] tracking-tight text-foreground" style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 900 }}>Hunie</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider"
                    style={{ backgroundColor: accent, color: tier === 'select' ? 'var(--background)' : '#fff' }}>
                    {name.toUpperCase()}
                  </span>
                </div>
                <p className="text-[13px] text-muted-foreground text-center px-4">{tagline}</p>
              </motion.button>
            );
          })}
        </motion.div>

        {/* 2x2 actions grid */}
        <motion.div className="mt-4 grid grid-cols-2 gap-3" variants={itemVariants}>
          <motion.button onClick={() => goShop('super_like')} className="hunie-card p-5 flex flex-col items-center gap-2" whileTap={{ scale: 0.97 }}>
            <div className="w-12 h-12 rounded-full bg-superlike/10 flex items-center justify-center">
              <Star className="w-6 h-6 text-superlike" fill="currentColor" />
            </div>
            <span className="text-[14px] font-semibold text-foreground">Super Likes</span>
          </motion.button>
          <motion.button onClick={() => goShop('boost')} className="hunie-card p-5 flex flex-col items-center gap-2" whileTap={{ scale: 0.97 }}>
            <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center">
              <Zap className="w-6 h-6 text-brand-purple" fill="currentColor" />
            </div>
            <span className="text-[14px] font-semibold text-foreground">Boosts</span>
          </motion.button>
          <motion.button onClick={() => handleIncognitoChange(!profile?.is_incognito)}
            className="hunie-card p-5 flex flex-col items-center gap-2 relative" whileTap={{ scale: 0.97 }}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${profile?.is_incognito ? 'bg-foreground' : 'bg-foreground/10'}`}>
              <EyeOff className={`w-6 h-6 ${profile?.is_incognito ? 'text-background' : 'text-foreground'}`} />
            </div>
            <span className="text-[14px] font-semibold text-foreground flex items-center gap-1">
              Modo Anónimo {!entitlements.invisibleMode && <Crown className="w-3 h-3 text-brand-purple" />}
            </span>
            {profile?.is_incognito && <span className="text-[11px] text-brand-purple font-semibold">Ativo</span>}
          </motion.button>
          <motion.button onClick={() => (isPremium ? soon() : goUpgrade())} className="hunie-card p-5 flex flex-col items-center gap-2" whileTap={{ scale: 0.97 }}>
            <div className="w-12 h-12 rounded-full bg-brand-purple/10 flex items-center justify-center">
              <Plane className="w-6 h-6 text-brand-purple" />
            </div>
            <span className="text-[14px] font-semibold text-foreground flex items-center gap-1">
              Passport {!isPremium && <Crown className="w-3 h-3 text-brand-purple" />}
            </span>
          </motion.button>
        </motion.div>

        {/* Conta */}
        <motion.div className="mt-6" variants={itemVariants}>
          <SectionHeader label="Definições da conta" />
          <div className="hunie-card overflow-hidden">
            <div className="w-full p-4 flex items-center justify-between border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <span className="text-[15px] text-foreground font-medium">Email</span>
              </div>
              <span className="text-[14px] text-muted-foreground truncate max-w-[200px]">{user?.email || '—'}</span>
            </div>
            <div className="w-full p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-muted-foreground" />
                <span className="text-[15px] text-foreground font-medium">Telefone</span>
              </div>
              <button onClick={() => setPhoneModalOpen(true)} className="text-[14px] text-brand-purple font-medium active:opacity-60">
                {profile?.phone || 'Adicionar'}
              </button>
            </div>
          </div>
          <p className="mt-2 px-1 text-[12px] text-muted-foreground">Um email verificado ajuda a proteger a tua conta.</p>
        </motion.div>

        {/* Discovery */}
        <motion.div className="mt-6" variants={itemVariants}>
          <SectionHeader icon={Compass} label="Descoberta" />
          <div className="hunie-card overflow-hidden">
            <button onClick={handleEnableLocation} disabled={locationLoading}
              className="w-full p-4 border-b border-white/[0.06] flex items-center justify-between transition-colors hover:bg-white/[0.02] disabled:opacity-60">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-muted-foreground" />
                <div className="text-left">
                  <span className="text-[15px] text-foreground font-medium block">Localização</span>
                  {locationPermission === 'granted' && (profile?.city || profile?.country) && (
                    <span className="text-[12px] text-muted-foreground">
                      {[profile?.city, profile?.country].filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
              </div>
              {locationLoading ? (
                <span className="text-[14px] text-muted-foreground">…</span>
              ) : locationPermission === 'granted' ? (
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" /> Ativa
                </span>
              ) : locationPermission === 'denied' ? (
                <span className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">Bloqueada</span>
              ) : (
                <span className="px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-foreground text-[12px] font-bold">Ativar</span>
              )}
            </button>

            {/* Distance */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[15px] text-foreground font-medium">Distância máxima</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums tracking-tight">{distanceValue} km</span>
              </div>
              <Slider value={[distanceValue]} onValueChange={(v) => setLiveDistance(v[0])}
                onValueCommit={handleDistanceChange} max={500} min={5} step={5} />
              <div className="flex justify-between mt-2 text-[13px] text-muted-foreground">
                <span>5 km</span><span>500 km</span>
              </div>
            </div>

            {/* Age */}
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[15px] text-foreground font-medium">Faixa etária</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums tracking-tight">{ageMin}–{ageMax}</span>
              </div>
              <Slider value={[ageMin, ageMax]} onValueChange={(v) => setLiveAge([v[0], v[1]])}
                onValueCommit={handleAgeChange} max={100} min={18} step={1} minStepsBetweenThumbs={3} />
              <div className="flex justify-between mt-2 text-[13px] text-muted-foreground">
                <span>18</span><span>100+</span>
              </div>
            </div>

            <button onClick={() => setInterestedSheet(true)} className="w-full p-4 flex items-center justify-between transition-colors hover:bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <Heart className="w-5 h-5 text-muted-foreground" />
                <span className="text-[15px] text-foreground font-medium">Interessado em</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[14px] text-muted-foreground">{interestedLabel}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </button>
          </div>
        </motion.div>

        {/* Premium discovery filters */}
        <motion.div className="mt-6" variants={itemVariants}>
          <div className="flex items-center gap-2 mb-3 px-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-purple" />
            <span className="text-[11px] font-semibold uppercase tracking-[1px] text-muted-foreground/70">Descoberta premium</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-md bg-brand-purple text-primary-foreground text-[9px] font-bold tracking-wider">
              {isPremium ? tierLabel.toUpperCase() : 'PLUS'}
            </span>
          </div>
          <p className="px-1 mb-3 text-[12px] leading-[1.5] text-muted-foreground">
            As tuas preferências mostram primeiro pessoas que combinam contigo. Não bloqueiam ninguém — continuas a poder dar match com outros perfis.
          </p>
          <div className="hunie-card overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[15px] text-foreground font-medium">Nº mínimo de fotos</span>
                <span className="text-[13px] font-semibold text-foreground tabular-nums tracking-tight">{minPhotosValue}</span>
              </div>
              <Slider value={[minPhotosValue]}
                onValueChange={(v) => isPremium && setLiveMinPhotos(v[0])}
                onValueCommit={handleMinPhotosChange}
                min={1} max={6} step={1} disabled={!isPremium} />
              <div className="flex justify-between mt-2 text-[13px] text-muted-foreground"><span>1</span><span>6</span></div>
            </div>
            <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-[15px] text-foreground font-medium">Tem bio</span>
              <Switch checked={requireBio} onCheckedChange={handleRequireBioChange} disabled={!isPremium} />
            </div>
            {['Interesses', 'À procura de', 'Idiomas', 'Signo', 'Educação', 'Planos de família'].map((label, i, arr) => (
              <button key={label} onClick={() => (isPremium ? soon() : goUpgrade())}
                className={`w-full p-4 flex items-center justify-between transition-colors hover:bg-white/[0.02] ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                <span className="text-[15px] text-foreground font-medium">{label}</span>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <span className="text-[14px]">Selecionar</span>
                  <ChevronRight className="w-4 h-4" />
                </div>
              </button>
            ))}
          </div>
          {!isPremium && (
            <motion.button
              onClick={() => goUpgrade()}
              whileTap={{ scale: 0.98 }}
              className="hunie-pill-primary mt-3 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[15px] font-semibold"
            >
              <Crown className="h-4 w-4" /> Desbloquear com Hunie Plus
            </motion.button>
          )}

        </motion.div>

        {/* Visibility */}
        <motion.div className="mt-6" variants={itemVariants}>
          <SectionHeader icon={Eye} label="Quem te vê" />
          <div className="hunie-card overflow-hidden">
            <motion.button onClick={() => handleVisibilityChange('standard')} disabled={saving}
              className="w-full p-4 flex items-center justify-between border-b border-white/[0.06] transition-colors hover:bg-white/[0.02]" whileTap={{ scale: 0.99 }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${visibilityMode === 'standard' ? 'bg-brand-purple' : 'bg-card border border-border'}`}>
                  <Eye className={`w-5 h-5 ${visibilityMode === 'standard' ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left">
                  <p className="text-[15px] text-foreground font-medium">Padrão</p>
                  <p className="text-[13px] text-muted-foreground">Visível na descoberta</p>
                </div>
              </div>
              {visibilityMode === 'standard' && (
                <div className="w-6 h-6 rounded-full bg-brand-purple flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.button>
            <motion.button onClick={() => handleVisibilityChange('hidden')} disabled={saving}
              className="w-full p-4 flex items-center justify-between transition-colors hover:bg-white/[0.02]" whileTap={{ scale: 0.99 }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${visibilityMode === 'hidden' ? 'bg-brand-purple' : 'bg-card border border-border'}`}>
                  <EyeOff className={`w-5 h-5 ${visibilityMode === 'hidden' ? 'text-white' : 'text-muted-foreground'}`} />
                </div>
                <div className="text-left">
                  <p className="text-[15px] text-foreground font-medium">Oculto</p>
                  <p className="text-[13px] text-muted-foreground">Não apareço na descoberta</p>
                </div>
              </div>
              {visibilityMode === 'hidden' && (
                <div className="w-6 h-6 rounded-full bg-brand-purple flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Notifications */}
        <motion.div className="mt-6" variants={itemVariants}>
          <SectionHeader icon={Bell} label="Notificações" />
          <div className="hunie-card overflow-hidden">
            <button
              type="button"
              onClick={() => navigate({ to: '/settings/notifications' })}
              className="w-full p-4 flex items-center justify-between hover:bg-muted/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-[15px] text-foreground font-medium">Notificações</p>
                  <p className="text-[13px] text-muted-foreground">Push, email e preferências por evento</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </motion.div>

        {/* Verification */}
        <motion.div className="mt-6" variants={itemVariants}>
          <SectionHeader icon={BadgeCheck} label="Verificação" />
          <div className="hunie-card overflow-hidden">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${profile?.is_verified ? 'bg-brand-purple border-brand-purple' : 'bg-card border-border'}`}>
                  <BadgeCheck className={`w-5 h-5 ${profile?.is_verified ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-[15px] text-foreground font-medium flex items-center gap-2">
                    Verificar perfil
                    {profile?.is_verified && <VerifiedBadge size="sm" />}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {profile?.is_verified ? 'Verificado' : 'Ganha o badge azul'}
                  </p>
                </div>
              </div>
              {!profile?.is_verified ? (
                <button onClick={() => setShowVerificationModal(true)}
                  className="text-[13px] font-medium text-brand-purple tracking-tight active:scale-95 transition-transform">
                  Verificar
                </button>
              ) : (
                <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Connections */}
        <motion.div className="mt-6" variants={itemVariants}>
          <SectionHeader icon={Ban} label="Conexões" />
          <div className="hunie-card overflow-hidden">
            <motion.button onClick={() => setShowBlockedUsers(true)}
              className="w-full p-4 flex items-center justify-between transition-colors hover:bg-white/[0.02]" whileTap={{ scale: 0.99 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-destructive" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] text-foreground font-medium">Utilizadores bloqueados</p>
                  <p className="text-[13px] text-muted-foreground">Gere a tua lista</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </div>
          <motion.div className="mt-3" variants={itemVariants}>
            <motion.button onClick={handleInstallApp}
              className="w-full p-4 flex items-center justify-between hunie-card transition-colors hover:bg-white/[0.02]" whileTap={{ scale: 0.99 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-success" />
                </div>
                <div className="text-left">
                  <p className="text-[15px] text-foreground font-medium">Instalar app</p>
                  <p className="text-[13px] text-muted-foreground">Adicionar ao ecrã inicial</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Account */}
        <motion.div className="mt-6" variants={itemVariants}>
          <SectionHeader icon={Crown} label="Conta" />
          <div className="hunie-card overflow-hidden">
            <motion.button onClick={() => goUpgrade()}
              className="w-full p-4 flex items-center justify-between border-b border-white/[0.06] transition-colors hover:bg-white/[0.02]" whileTap={{ scale: 0.99 }}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPremium ? 'bg-amber-500' : 'bg-amber-500/10'}`}>
                  <Crown className={`w-5 h-5 ${isPremium ? 'text-white' : 'text-amber-500'}`} />
                </div>
                <div className="text-left">
                  <p className="text-[15px] text-foreground font-medium flex items-center gap-2">
                    Subscrição
                    {isPremium && <PremiumBadge size="sm" />}
                  </p>
                  <p className="text-[13px] text-muted-foreground">
                    {isPremium ? `Hunie ${tierLabel} ativo` : 'Fazer upgrade'}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <motion.button onClick={handleLogout}
              className="w-full p-4 flex items-center justify-between border-b border-white/[0.06] transition-colors hover:bg-white/[0.02]" whileTap={{ scale: 0.99 }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center">
                  <LogOut className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-[15px] text-foreground font-medium">Terminar sessão</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </motion.button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <motion.button className="w-full p-4 flex items-center justify-between transition-colors hover:bg-white/[0.02]" whileTap={{ scale: 0.99 }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </div>
                    <span className="text-destructive font-medium">Eliminar conta</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-destructive/50" />
                </motion.button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border rounded-3xl">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">Tens a certeza?</AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    Esta ação não pode ser desfeita. A tua conta será permanentemente eliminada, incluindo todos os matches e mensagens.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="bg-card border-border text-foreground hover:bg-white/[0.02] rounded-xl">Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={deleting}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>

        <motion.div className="mt-8 text-center" variants={itemVariants}>
          <p className="text-muted-foreground text-sm">Hunie v1.0.0</p>
        </motion.div>
      </motion.div>

      <VerificationModal open={showVerificationModal} onOpenChange={setShowVerificationModal} />
      <BlockedUsersModal open={showBlockedUsers} onOpenChange={setShowBlockedUsers} />
      <PhoneVerificationModal open={phoneModalOpen} onOpenChange={setPhoneModalOpen} />

      <Sheet open={interestedSheet} onOpenChange={setInterestedSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-card border-border">
          <SheetHeader>
            <SheetTitle className="text-foreground">Interessado em</SheetTitle>
            <SheetDescription className="text-muted-foreground">Quem queres ver na descoberta.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {([
              { key: 'women' as const, label: 'Mulheres' },
              { key: 'men' as const, label: 'Homens' },
              { key: 'everyone' as const, label: 'Todos' },
            ]).map(({ key, label }) => (
              <button key={key} onClick={() => setInterested(key)}
                className="w-full p-4 rounded-xl bg-background border border-border flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <span className="text-[15px] text-foreground font-medium">{label}</span>
                {interestedKey === key && <Check className="w-5 h-5 text-brand-purple" />}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
      <PaywallSheet open={paywallOpen} onClose={() => setPaywallOpen(false)} />
    </div>
  );
}
