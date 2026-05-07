import { createClient } from '@supabase/supabase-js';
import { generateRssXml } from '../src/lib/rss';
export default async function handler(req, res) {
    const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data: episodes, error } = await supabase
        .from('episodes')
        .select('*')
        .order('date', { ascending: false })
        .limit(20);
    if (error) {
        res.status(500).json({ error: error.message });
        return;
    }
    const xml = generateRssXml(episodes ?? []);
    res.setHeader('Content-Type', 'application/rss+xml; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.status(200).send(xml);
}
