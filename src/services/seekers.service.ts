import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  EducationDTO,
  ExperienceDTO,
  UpdateSeekerDTO,
} from 'src/dto/update/seeker.updateDto';
import { Education, Experience, JobSeekers } from 'src/entities/seekers.entity';
import { Repository } from 'typeorm';

import PDFDocument from 'pdfkit';

@Injectable()
export class SeekerService {
  constructor(
    @InjectRepository(JobSeekers)
    private jobSeekerRepository: Repository<JobSeekers>,

    @InjectRepository(Education)
    private educationRepository: Repository<Education>,

    @InjectRepository(Experience)
    private experienceRepository: Repository<Experience>,
  ) {}

  async addSeekerEducation(user: JobSeekers, data: EducationDTO) {
    const newSeekerEducation = await this.educationRepository.save(
      this.educationRepository.create({ ...data, jobSeeker: user }),
    );
    return { newSeekerEducation };
  }

  async addSeekerExperience(user: JobSeekers, data: ExperienceDTO) {
    const newSeekerExperience = await this.experienceRepository.save(
      this.experienceRepository.create({ ...data, jobSeeker: user }),
    );
    return { newSeekerExperience };
  }

  async updateSeeker(userId: string, seekerDto: UpdateSeekerDTO) {
    const seeker = await this.jobSeekerRepository.preload({
      id: userId,
      ...seekerDto,
    });
    return await this.jobSeekerRepository.save(seeker);
  }

  async deleteSeekerEducation(user: JobSeekers, id: string) {
    const seekerEducation = await this.educationRepository.findOne({
      where: { id, jobSeeker: { id: user.id } },
    });
    await this.educationRepository.remove(seekerEducation);
    return {
      message: 'Education deleted successfully',
    };
  }

  async deleteSeekerExperience(user: JobSeekers, id: string) {
    const seekerExperience = await this.experienceRepository.findOne({
      where: { id, jobSeeker: { id: user.id } },
    });
    await this.experienceRepository.remove(seekerExperience);
    return {
      message: 'Experience deleted successfully',
    };
  }

  async getSeeker(id: string) {
    const seeker = await this.jobSeekerRepository.findOneBy({ id });
    if (!seeker) {
      return {
        status: 'error',
        message: 'Seeker not found',
      };
    }
    return seeker;
  }

  async deleteSeeker(id: string) {
    const seeker = await this.jobSeekerRepository.findOneBy({ id });
    if (!seeker) {
      return {
        status: 'error',
        message: 'Seeker not found',
      };
    }
    seeker.remove();
    return {
      status: 'success',
      message: 'Seeker deleted successfully',
    };
  }

  async deleteSelf(user: JobSeekers) {
    user.remove();
    return {
      status: 'success',
      message: 'Seeker deleted successfully',
    };
  }

  async generateCV(jobSeekerId: string) {
    const jobSeeker = await this.jobSeekerRepository.findOneOrFail({
      where: { id: jobSeekerId },
      relations: ['experiences', 'educations'],
    });

    if (!jobSeeker) {
      throw new NotFoundException(`JobSeeker with id ${jobSeekerId} not found`);
    }

    const pdf = new PDFDocument();
    pdf.font('Helvetica-Bold');

    // Header
    pdf.fontSize(20).text(`Curriculum Vitae`, { align: 'center' });
    pdf
      .fontSize(16)
      .text(`${jobSeeker.fName} ${jobSeeker.lName}`, { align: 'center' });
    pdf.moveDown(1);

    // Experiences
    pdf.fontSize(18).text('Experiences');
    jobSeeker.experiences.forEach((experience) => {
      pdf.moveDown(0.5);
      pdf.fontSize(16).text(`${experience.title} at ${experience.employer}`);
      pdf.fontSize(14).text(`Location: ${experience.country}`);
      pdf
        .fontSize(14)
        .text(
          `Duration: ${experience.startDate.toDateString()} - ${
            experience.isCurrentRole
              ? 'Present'
              : experience.endDate.toDateString()
          }`,
        );
      pdf.fontSize(14).text(`Responsibilities: ${experience.responsibilities}`);
      pdf.moveDown(0.5);
    });

    // Education
    pdf.moveDown(1);
    pdf.fontSize(18).text('Education');
    jobSeeker.education.forEach((education) => {
      pdf.moveDown(0.5);
      pdf.fontSize(16).text(`${education.degree} in ${education.fieldOfStudy}`);
      pdf.fontSize(14).text(`Institution: ${education.institution}`);
      pdf
        .fontSize(14)
        .text(
          `Duration: ${education.startDate.toDateString()} - ${
            education.isStudying ? 'Present' : education.endDate.toDateString()
          }`,
        );
      pdf.moveDown(0.5);
    });

    pdf.end();
    return pdf;
  }
}
