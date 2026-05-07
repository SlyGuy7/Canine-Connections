-- Seed data for the resources table
-- Run on Henil's Node2: mysql -u adoption_user -p adoption_center < seed_resources.sql

INSERT INTO `resources` (`title`, `category`, `content_type`, `url`, `description`, `is_published`) VALUES

-- Training
('How to Crate Train Your Dog',            'training', 'article', 'https://www.akc.org/expert-advice/training/crate-training-101/',               'A step-by-step guide to introducing your dog to a crate and making it their safe space.',                                   1),
('Teaching Basic Commands: Sit, Stay, Come','training', 'article', 'https://www.akc.org/expert-advice/training/teach-your-dog-these-5-basic-commands/', 'Master the five essential commands every dog should know using positive reinforcement.',                                    1),
('Leash Training for Puppies and Adults',  'training', 'article', 'https://www.akc.org/expert-advice/training/expert-tips-dog-leash-issues/',      'Stop pulling and learn how to make walks enjoyable for both you and your dog.',                                             1),
('Positive Reinforcement: The Science',    'training', 'article', 'https://www.akc.org/expert-advice/training/clicker-training-your-dog/',           'Understand why reward-based training works better than punishment-based methods.',                                          1),
('Puppy Socialization Guide',              'training', 'article', 'https://www.akc.org/expert-advice/dog-breeding/puppy-socialization/',             'The critical window for socialization and how to expose your puppy to new experiences safely.',                             1),
('How to Stop Your Dog from Jumping Up',  'training', 'article', 'https://www.akc.org/expert-advice/training/how-to-stop-a-dog-from-jumping/',    'Consistent techniques to teach your dog to keep all four paws on the ground when greeting people.',                        1),

-- Nutrition
('What to Feed Your Dog: A Complete Guide','nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/best-dog-food/',                    'Learn about different food types — dry, wet, raw — and how to choose the right one for your dog.',                         1),
('Human Foods That Are Dangerous to Dogs', 'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/human-foods-dogs-can-and-cant-eat/', 'A comprehensive list of foods you should never feed your dog, and safe alternatives.',                                      1),
('How Much Should I Feed My Dog?',         'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/how-much-should-i-feed-my-dog/',    'Portion sizing based on your dog\'s age, weight, and activity level.',                                                     1),
('Understanding Dog Food Labels',          'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/how-to-read-dog-food-labels/',       'Decode ingredient lists, guaranteed analysis, and AAFCO statements to pick quality food.',                                  1),
('Hydration and Water Intake for Dogs',    'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/how-much-water-should-a-dog-drink/', 'How much water your dog needs daily and signs of dehydration to watch for.',                                               1),

-- Health
('Dog Vaccination Schedule: What You Need','health', 'article', 'https://www.akc.org/expert-advice/health/puppy-shots-complete-guide/',             'Core vs. non-core vaccines, when to get them, and how to stay on schedule.',                                               1),
('Flea, Tick, and Heartworm Prevention',   'health', 'article', 'https://www.akc.org/expert-advice/health/parasite-prevention-dogs/',               'Overview of preventative treatments and why year-round protection matters.',                                                1),
('Signs Your Dog Needs to See a Vet',      'health', 'article', 'https://www.akc.org/expert-advice/health/should-i-call-my-dogs-vet/',            'Recognize the warning signs that mean your dog needs professional medical attention.',                                      1),
('Dental Care for Dogs',                   'health', 'article', 'https://www.akc.org/expert-advice/health/dog-dental-care/',                        'Brushing, dental chews, and professional cleanings — everything you need to keep teeth healthy.',                           1),
('Spaying and Neutering: Benefits & Myths','health', 'article', 'https://www.humanesociety.org/resources/why-you-should-spay-or-neuter-your-pet',   'The health and behavioral benefits of spay/neuter and common misconceptions addressed.',                                    1),
('Senior Dog Care: What Changes at Age 7', 'health', 'article', 'https://www.akc.org/expert-advice/health/senior-dog-care/',                        'How to adapt diet, exercise, and vet visits as your dog enters their senior years.',                                         1),

-- Behavior
('Why Does My Dog Bark So Much?',          'behavior', 'article', 'https://www.akc.org/expert-advice/training/how-to-stop-dog-barking/',           'Identify the type of barking and get targeted strategies to reduce it.',                                                    1),
('Separation Anxiety in Dogs',             'behavior', 'article', 'https://www.aspca.org/pet-care/dog-care/separation-anxiety',                     'Understand the causes of separation anxiety and a step-by-step desensitization plan.',                                      1),
('How to Introduce a New Dog to Your Home','behavior', 'article', 'https://www.akc.org/expert-advice/training/how-to-introduce-dogs/',               'A safe protocol for introducing a newly adopted dog to existing pets and family members.',                                  1),
('Understanding Dog Body Language',        'behavior', 'article', 'https://www.akc.org/expert-advice/advice/how-to-read-dog-body-language/',         'Learn to read tail position, ear posture, and facial expressions to understand how your dog feels.', 1),
('Dealing with Resource Guarding',         'behavior', 'article', 'https://www.akc.org/expert-advice/training/resource-guarding/',                  'Safe, effective techniques to address food and toy guarding without escalating aggression.',                                 1),

-- General
('Adopting a Dog: First 30 Days Guide',    'general', 'article', 'https://www.petmd.com/dog/care/10-tips-first-30-days-after-adopting-dog',       'A week-by-week guide to helping your newly adopted dog settle in and feel at home.',                                         1),
('Exercise Needs by Dog Breed Group',      'general', 'article', 'https://www.akc.org/expert-advice/lifestyle/how-much-exercise-does-a-dog-need/',   'How much daily activity different breeds need — from high-energy working dogs to calm companions.',                         1),
('Dog-Proofing Your Home',                 'general', 'article', 'https://www.akc.org/expert-advice/home-living/how-to-pet-proof-your-home/',     'Room-by-room checklist to make your home safe before bringing a new dog home.',                                             1),
('Traveling with Your Dog',                'general', 'article', 'https://www.akc.org/expert-advice/lifestyle/how-to-travel-with-a-dog/',            'Car rides, air travel, and hotels — tips for stress-free travel with your dog.',                                            1),
('Grooming Basics for Every Dog Owner',    'general', 'article', 'https://www.akc.org/expert-advice/grooming/',                                      'Brushing, bathing, nail trimming, and ear cleaning — a maintenance schedule for every coat type.',                         1),
('The True Cost of Dog Ownership',         'general', 'article', 'https://www.akc.org/expert-advice/lifestyle/the-true-cost-of-dog-ownership/',      'Annual expenses broken down by size: food, vet bills, grooming, supplies, and more.',                                      1);
