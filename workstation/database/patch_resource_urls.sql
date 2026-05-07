-- Patch broken resource URLs
-- Run on Henil's Node2: mysql -u adoption_user -pREDACTED adoption_center < ~/Capstone-Group-01/workstation/database/patch_resource_urls.sql

UPDATE resources SET url = 'https://www.akc.org/expert-advice/training/expert-tips-dog-leash-issues/'
  WHERE title = 'Leash Training for Puppies and Adults';

UPDATE resources SET url = 'https://www.akc.org/expert-advice/training/how-to-stop-a-dog-from-jumping/'
  WHERE title = 'How to Stop Your Dog from Jumping Up';

UPDATE resources SET url = 'https://www.akc.org/expert-advice/nutrition/how-much-should-i-feed-my-dog/'
  WHERE title = 'How Much Should I Feed My Dog?';

UPDATE resources SET url = 'https://www.akc.org/expert-advice/health/should-i-call-my-dogs-vet/'
  WHERE title = 'Signs Your Dog Needs to See a Vet';

UPDATE resources SET url = 'https://www.akc.org/expert-advice/training/how-to-stop-dog-barking/'
  WHERE title = 'Why Does My Dog Bark So Much?';

UPDATE resources SET url = 'https://www.akc.org/expert-advice/training/how-to-introduce-dogs/'
  WHERE title = 'How to Introduce a New Dog to Your Home';

UPDATE resources SET url = 'https://www.petmd.com/dog/care/10-tips-first-30-days-after-adopting-dog'
  WHERE title = 'Adopting a Dog: First 30 Days Guide';

UPDATE resources SET url = 'https://www.akc.org/expert-advice/home-living/how-to-pet-proof-your-home/'
  WHERE title = 'Dog-Proofing Your Home';
