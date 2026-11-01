/** Public browser configuration for Eventora development. RLS protects all event data.
 * This publishable key is not a service-role key or an administrative credential.
 * Environment overrides can select another project; VITE_DEMO_ONLY=true disables accounts.
 */
export const publicProject = {
  url: "https://ewpxeaymozlnfnkthjgp.supabase.co",
  publishableKey: "sb_publishable_IceJmumgAMi-RJ2hRLBYig_vtiQ28Ht",
} as const;
