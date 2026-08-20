-- Integrate Prompt 4A with the existing feature registry/listing rules.
update public.feature_registry
set status='enabled', display_name='Promotions & Advertising',
    config=config || '{"prompt":"4A","engine":"marketing_campaigns"}'::jsonb,
    updated_at=now()
where feature_key='promotions';

insert into public.listing_feature_rules(feature_id,enabled,requires_admin_approval,allow_free_listing,platform_fee_enabled,platform_fee_percent,status,config)
select feature_id,true,true,true,false,0,'enabled','{"promotion_types":["sponsored_listing","promoted_product","promoted_service","promoted_course","promoted_job","creator_promotion","search_placement","category_placement","homepage_placement","recommendation_placement","banner","campaign_promotion"]}'::jsonb
from public.feature_registry where feature_key='promotions'
on conflict(feature_id) do update set enabled=true,requires_admin_approval=true,status='enabled',config=public.listing_feature_rules.config || excluded.config,updated_at=now();

insert into public.promotion_pricing(pricing_key,promotion_type,pricing_model,unit_price,enabled)
values ('sponsored_listing_cpm','sponsored_listing','CPM',0,false),('sponsored_listing_cpc','sponsored_listing','CPC',0,false),('banner_cpm','banner','CPM',0,false)
on conflict(pricing_key) do nothing;
