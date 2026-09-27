USE adoption_center;

-- Seed data for resources table
-- Run on all DB nodes: mysql -u adoption_user -p adoption_center < seeds.sql

INSERT IGNORE INTO resources (title, category, content_type, url, description, is_published) VALUES
('How to Crate Train Your Dog', 'training', 'article', 'https://www.akc.org/expert-advice/training/how-to-crate-train-your-dog-in-9-easy-steps/', 'Step-by-step guide to introducing your dog to their crate and making it a positive space.', 1),
('Sit, Stay, Come: Teaching Basic Commands', 'training', 'article', 'https://www.akc.org/expert-advice/training/teach-your-puppy-these-5-basic-commands/', 'Foundation commands every dog should know, with positive reinforcement techniques.', 1),
('Leash Training Tips for New Dog Owners', 'training', 'article', 'https://www.akc.org/expert-advice/training/teach-puppy-walk-leash/', 'Stop pulling on walks and build a calm, enjoyable leash habit.', 1),
('Clicker Training Basics', 'training', 'video', 'https://www.youtube.com/watch?v=pF-GFGTSnfo', 'Learn how marker-based training works and how to get started with a clicker.', 1),
('Potty Training Your New Dog', 'training', 'article', 'https://www.akc.org/expert-advice/training/how-to-housetrain-an-adult-dog/', 'A consistent routine-based approach to house training dogs of any age.', 1),
('Dog Food 101: Reading the Label', 'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/how-to-read-dog-food-labels/', 'Understand ingredients lists, protein percentages, and what certifications matter.', 1),
('How Much Should I Feed My Dog?', 'nutrition', 'article', 'https://www.petmd.com/dog/nutrition/are-you-feeding-your-dog-right-amount', 'Portion guidance by weight, age, and activity level to avoid overfeeding.', 1),
('Human Foods Dogs Can and Cannot Eat', 'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/human-foods-dogs-can-and-cant-eat/', 'Comprehensive list of safe treats and dangerous foods to keep away from your dog.', 1),
('Raw Diet for Dogs: Pros and Cons', 'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/raw-dog-food-dietary-concerns-benefits-risks/', 'An objective look at raw feeding — benefits, risks, and vet recommendations.', 1),
('Healthy Homemade Dog Treats', 'nutrition', 'article', 'https://www.akc.org/expert-advice/nutrition/healthy-homemade-dog-treat-recipes/', 'Simple, vet-approved treat recipes you can make with pantry staples.', 1),
('New Dog Vet Visit Checklist', 'health', 'article', 'https://www.akc.org/expert-advice/health/new-puppy-first-vet-visit/', 'What to bring, what questions to ask, and what to expect at your first appointment.', 1),
('Vaccinations Your Dog Needs', 'health', 'article', 'https://www.avma.org/resources-tools/pet-owners/petcare/vaccinations', 'Core and non-core vaccines explained, with a typical schedule for puppies and adults.', 1),
('Flea, Tick & Heartworm Prevention Guide', 'health', 'article', 'https://www.akc.org/expert-advice/health/heartworm-in-dogs/', 'Preventive treatments compared — pills, topicals, collars — and how each works.', 1),
('Signs Your Dog Needs Emergency Vet Care', 'health', 'article', 'https://www.akc.org/expert-advice/health/dog-emergency-vet/', 'Symptoms that require immediate attention vs. issues that can wait for a regular appointment.', 1),
('Dental Health for Dogs', 'health', 'article', 'https://www.akc.org/expert-advice/health/dog-dental-care/', 'How to brush your dog''s teeth and why oral hygiene matters for overall health.', 1),
('Understanding Dog Body Language', 'behavior', 'article', 'https://www.akc.org/expert-advice/advice/how-to-read-dog-body-language/', 'Learn to read what your dog is communicating through posture, ears, tail, and eyes.', 1),
('Why Dogs Bark and How to Manage It', 'behavior', 'article', 'https://www.akc.org/expert-advice/training/curb-excessive-dog-barking/', 'Common triggers for barking and humane strategies to reduce excessive noise.', 1),
('Separation Anxiety in Dogs', 'behavior', 'article', 'https://www.aspca.org/pet-care/dog-care/separation-anxiety', 'Recognizing separation anxiety and a step-by-step desensitization approach.', 1),
('How to Socialize Your Dog', 'behavior', 'article', 'https://www.animalhumanesociety.org/resource/socializing-your-dog', 'Safely introducing your dog to new people, animals, and environments.', 1),
('Dealing with Resource Guarding', 'behavior', 'article', 'https://www.whole-dog-journal.com/behavior/resource-guarding/', 'What to do — and not do — when your dog guards food, toys, or space.', 1),
('The Adoption Adjustment Period', 'general', 'article', 'https://www.humanesociety.org/resources/bringing-your-new-dog-home', 'The first 3 days, 3 weeks, and 3 months after adoption and what to expect.', 1),
('Setting Up Your Home for a New Dog', 'general', 'article', 'https://www.akc.org/expert-advice/dog-life/preparing-home-new-dog/', 'Dog-proofing checklist, essential supplies, and how to set boundaries from day one.', 1),
('Pet Insurance Explained', 'general', 'article', 'https://www.nerdwallet.com/insurance/pet/learn/is-pet-insurance-worth-it', 'How pet insurance works, what it covers, and whether it makes financial sense.', 1),
('Traveling with Your Dog', 'general', 'article', 'https://www.akc.org/expert-advice/dog-life/road-trip-with-dog/', 'Car safety, hotel stays, and keeping your dog calm and comfortable on trips.', 1),
('Finding a Good Dog Walker or Sitter', 'general', 'article', 'https://www.dogster.com/lifestyle/how-to-hire-a-dog-walker', 'What to look for, questions to ask, and red flags to avoid when hiring pet care help.', 1);
