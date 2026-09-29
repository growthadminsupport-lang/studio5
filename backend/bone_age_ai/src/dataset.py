from numpy import float32
import torch
from torch.utils.data import Dataset, DataLoader
import pandas as pd

from torchvision.io import decode_image
from torchvision import transforms
import os


'''
    label(output): boneage
    feature(input): -image
                    -male (t/f)

    1. Load the dataset from the folder
    2. create a custom dataset for set the feature and label
    3.
'''

class BoneAgeDataset(Dataset):
    #a custom dataset for feature and label

    '''
    What information will the dataset need?
    : id, boneage, gender for the label + img
    '''

    def __init__(self, label_dir, img_dir, transform = None):


        """Get the CSV data (label for the training dataset)"""
        #read the csv from directory
        df = pd.read_csv(label_dir)
        #Keep the label/csv as a dataframe/array

        """
        Feature: Create a var to store the image from the folder and store it as its path to reduce the memory.
        """
        #create an array to store img_path instead of the actual img
        self.img_dir = img_dir
        self.img_filenames = df['id'].astype(str) + '.png'
        #img_filenames as a dataframe which stores the name of img

        """
        Label: Create a var to store gender.
        Giving that 1 is True (is male) and 0 is False (is female).
        """
        self.genders = df["male"].astype(float)

        """
        Label: Create a var to store 'bone age'
        """
        self.bone_ages = df['boneage'].to_numpy().astype(float32)
        self.transform = transform

    #return the total number of data
    def __len__(self):
        return len(self.img_filenames)

    """
    Getting an image and merge it with the label as a tuple to give to the model
    """
    def __getitem__(self, idx):

        img_dir = os.path.join(self.img_dir, self.img_filenames[idx])
        img = decode_image(img_dir) #transform img to unit8 tensor

        gender = self.genders[idx]
        bone_age = self.bone_ages[idx]

        #if the 'data augmentation' process is needed
        if self.transform:
            img = self.transform(img)

        return (img,
                torch.tensor(gender, dtype=torch.float32),
                torch.tensor(bone_age, dtype=torch.float32))

if __name__ == "__main__":
    csv_dir = 'data/train.csv'
    img_path = 'data/boneage-training-dataset'
    df = pd.read_csv(csv_dir)

    transform = transforms.Compose([
        transforms.Resize((256,256)),
        transforms.ConvertImageDtype(torch.float32), #decode_image return the output as uint8
        transforms.Grayscale(num_output_channels=3),
    ])

    #test retriveving the dataset
    raw_dataset = BoneAgeDataset(img_dir=img_path,
                                 label_dir=csv_dir,
                                 transform=transform)

    '''
    sample_idx = 5
    img, bone_ages, gender = raw_dataset[sample_idx]
    print(f"\nSample {sample_idx} - img: {img}")
    print(f"Sample {sample_idx} - bone_age: {bone_ages}")
    print(f"Sample {sample_idx} - gender: {gender}")
    print(f"Dataset length: {len(raw_dataset)}")
    '''

    #DataLoader need the each tensor to be equal size
    train_loader = DataLoader(
        dataset = raw_dataset,
        batch_size = 32,
        shuffle = True,
        num_workers=0
    )

    #print out to check the dataloader work correctly
    train_img, train_gender, train_boneage = next(iter(train_loader))

    print(f"train_img batch shape: {train_img.size()}")
    print(f"train_gender batch shape: {train_gender.size()}")
    print(f"train_boneage batch shape: {train_boneage.size()}")
    show_img = train_img[0].squeeze().numpy()
    show_train_label = train_boneage[0]
    #plt.imshow(show_img, cmap='gray')
    #plt.savefig('sample.png')
    print(f"label: {show_train_label}")
    print(train_img.dtype, train_img.min(), train_img.max())
    print(train_boneage.dtype, train_gender.dtype)
    print(train_boneage[:10], train_gender[:10])
