do $$ declare c uuid; d uuid; begin
 if exists(select 1 from catalogues where code='harbour-outdoors') then return; end if;
 insert into catalogues(code,name,owner,purpose) values('harbour-outdoors','Harbour Outdoors','Mara','Public product discovery and search quality review') returning id into c;
 insert into catalogues(code,name,owner,purpose) values('harbour-guides','Harbour Guides','Ravi','Public equipment guides') returning id into d;
 insert into records(catalogue_id,object_id,name,description,category,available,reviewed_on,expires_on) values
 (c,'P-101','Alpine rain jacket','Waterproof shell for wet winter walks','Clothing',true,current_date-5,null),
 (c,'P-102','Coastal rain jacket','Light waterproof walking shell','Clothing',true,current_date-50,null),
 (c,'P-103','Trail rucksack','Thirty litre walking backpack with rain cover','Packs',true,current_date-8,null),
 (c,'P-104','Summit hiking boots','Leather waterproof walking boots','Footwear',false,current_date-4,null),
 (c,'P-105','Summer tent offer','Two person camping tent','Camping',true,current_date-10,current_date-2),
 (c,'P-106','Trekking poles','Adjustable aluminium walking poles','Equipment',true,null,null),
 (d,'G-101','Rain jacket care guide','Wash and reproof waterproof clothing','Care',true,current_date-3,null);
 insert into synonyms(catalogue_id,term,expansion,owner,review_on) values
 (c,'daypack','rucksack','Mara',current_date+30),(c,'slicker','rain jacket','Mara',current_date-4);
 insert into relevance_cases(catalogue_id,query,expected_object_id,max_rank,rationale) values
 (c,'waterproof jacket','P-101',2,'Wet-weather bestseller should be near the top'),
 (c,'daypack','P-103',1,'Local term should find the rucksack'),
 (c,'boots','P-104',3,'Stock shortage remains visible in the review');
 insert into query_events(catalogue_id,query,result_count,occurred_on) values
 (c,'gaiters',0,current_date-1),(c,'gaiters',0,current_date-2),(c,'boots',0,current_date-1),
 (c,'waterproof jacket',2,current_date-1),(c,'daypack',1,current_date-40);
 insert into tasks(catalogue_id,title,owner,due_on) values
 (c,'Confirm delivery date for Summit boots','Ravi',current_date-3),
 (c,'Review Coastal jacket description','Mara',current_date+2);
 insert into notes(catalogue_id,body,author) values(c,'Fictional demonstration catalogue. No customer data.','Demo seed');
end $$;
